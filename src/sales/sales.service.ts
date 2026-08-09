import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // ─── Resolve Salesman ID (Admin Fallback) ─────────────
  private async resolveSalesmanId(requestUserId?: string): Promise<string> {
    if (requestUserId) return requestUserId;

    const fallbackUser = await (this.prisma as any).user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (fallbackUser) return fallbackUser.id;

    let role = await (this.prisma as any).role.findFirst({ where: { name: 'Super Admin' } });
    if (!role) {
      role = await (this.prisma as any).role.create({ data: { name: 'Super Admin', is_system: true } });
    }

    const newUser = await (this.prisma as any).user.create({
      data: {
        first_name: 'POS',
        last_name: 'Admin',
        email: 'admin@nexasoft.com',
        password_hash: await bcrypt.hash('Admin@123', 10),
        is_super_admin: true,
        status: 'ACTIVE',
      },
    });

    await (this.prisma as any).user_roles.create({
      data: { user_id: newUser.id, role_id: role.id, updated_at: new Date() },
    });

    return newUser.id;
  }

  // ─── SALE CREATE (SERIAL-FIRST POS ENGINE) ──────────────────────────
  async createSale(data: any) {
    const { items, customerName, customerPhone, discount = 0, paidAmount = 0 } = data;

    if (!items || items.length === 0) throw new BadRequestException('Cart is empty. Scan items first.');

    const finalUserId = await this.resolveSalesmanId(data.userId);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Handle Customer Data
      let finalCustomerId: string | null = null;
      if (customerPhone || customerName) {
        const nameToSave = customerName || 'Walk-in Customer';
        if (customerPhone) {
          const existing = await (tx as any).customer.findFirst({ where: { phone: customerPhone } });
          finalCustomerId = existing ? existing.id : (await (tx as any).customer.create({ data: { name: nameToSave, phone: customerPhone } })).id;
        } else {
          finalCustomerId = (await (tx as any).customer.create({ data: { name: nameToSave } })).id;
        }
      }

      // 2. Process Cart Items (Group by Product ID for SaleItems)
      let calculatedSubTotal = 0;
      const productQuantities = new Map<string, { qty: number; totalSalePrice: number }>();
      
      // 🔴 VIP FIX: Added explicit string[] types here to resolve the 'never' TS error
      const serialIds: string[] = [];
      const serialNumberStrings: string[] = [];

      for (const item of items) {
        if (!item.serialId) throw new BadRequestException('Invalid cart item: Serial ID missing.');
        
        calculatedSubTotal += Number(item.price);
        serialIds.push(item.serialId);

        // Fetch Serial Info & Validate Status
        const serial = await (tx as any).serialized_products.findUnique({
          where: { id: item.serialId },
          select: { product_id: true, status: true, serial_number: true },
        });

        if (!serial) throw new BadRequestException(`Serial not found in database.`);
        if (serial.status === 'SOLD') throw new BadRequestException(`Alert! Serial '${serial.serial_number}' is already SOLD.`);
        
        serialNumberStrings.push(serial.serial_number);

        const pId = serial.product_id;
        if (!productQuantities.has(pId)) productQuantities.set(pId, { qty: 0, totalSalePrice: 0 });
        
        const pq = productQuantities.get(pId)!;
        pq.qty += 1;
        pq.totalSalePrice += Number(item.price);
      }

      const grandTotal = calculatedSubTotal - Number(discount);
      const finalPaidAmount = Number(paidAmount);
      let paymentStatus = finalPaidAmount <= 0 ? 'PENDING' : finalPaidAmount < grandTotal ? 'PARTIAL' : 'PAID';
      const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 3. Generate Sale Record
      const sale = await (tx as any).sale.create({
        data: {
          invoice_number: invoiceNumber,
          customer_id: finalCustomerId,
          salesman_id: finalUserId,
          total_amount: grandTotal,
          discount: Number(discount),
          paid_amount: finalPaidAmount,
          payment_method: 'CASH',
          payment_status: paymentStatus,
          items: {
            create: Array.from(productQuantities.entries()).map(([pId, val]) => ({
              product_id: pId,
              quantity: val.qty,
              sale_price: val.totalSalePrice / val.qty, 
            })),
          },
        },
      });

      // 4. Update Payment Ledger
      if (finalPaidAmount > 0) {
        await (tx as any).payment.create({
          data: {
            sale_id: sale.id,
            customer_id: finalCustomerId,
            received_by: finalUserId,
            amount: finalPaidAmount,
            method: 'CASH',
            type: 'SALE_PAYMENT',
            reference_number: `REC-${invoiceNumber}`,
          },
        });
      }

      // 5. Update Serial Statuses & Inventory
      // Shop inventory (Main DB)
      await (tx as any).serialized_products.updateMany({
        where: { id: { in: serialIds } },
        data: {
          status: 'SOLD',
          sale_invoice_id: sale.id,
          customer_id: finalCustomerId,
          sale_date: new Date(),
        },
      });

      // Deduct Opening Stock & Log Transaction
      for (const [pId, val] of Array.from(productQuantities.entries())) {
        await (tx as any).product.update({
          where: { id: pId },
          data: { opening_stock: { decrement: val.qty } },
        });
        await (tx as any).inventoryTransaction.create({
          data: {
            product_id: pId, type: 'SALE', quantity: -val.qty, sale_id: sale.id, notes: `Sold via POS — ${invoiceNumber}`,
          },
        });
      }

      // 6. SYNC WITH GODAM LOGS (Crucial Integration Step)
      try {
        await (tx as any).godamHardwareSerial.updateMany({
          where: { serialNumber: { in: serialNumberStrings } },
          data: { status: 'SOLD_FROM_GODAM', updatedAt: new Date() },
        });
      } catch (e) {
        console.warn('Sync warning: Serials not found in Godam tracking.');
      }

      return {
        success: true,
        invoice_number: sale.invoice_number,
        message: 'Checkout completed successfully!',
      };
    }, { maxWait: 20000, timeout: 120000 });
  }

  // ─── QUERIES & RETURNS (Intact from previous logic) ──────────────────────
  async processReturn(saleId: string, data: any) {
    const { itemsToReturn } = data;
    if (!itemsToReturn?.length) throw new BadRequestException('Koi item select nahi kiya!');

    const finalUserId = await this.resolveSalesmanId(data.userId);

    return await this.prisma.$transaction(async (prisma) => {
      let totalRefundAmount = 0;

      for (const returnItem of itemsToReturn) {
        const saleItem = await (prisma as any).saleItem.findFirst({
          where: { sale_id: saleId, product_id: returnItem.productId },
        });

        if (!saleItem || saleItem.quantity < returnItem.quantity) {
          throw new BadRequestException('Invalid return quantity!');
        }

        const unitPrice   = saleItem.sale_price ?? 0;
        const refundValue = Number(unitPrice) * returnItem.quantity;
        totalRefundAmount += refundValue;

        const returnTasks: Promise<any>[] = [
          saleItem.quantity === returnItem.quantity
            ? (prisma as any).saleItem.delete({ where: { id: saleItem.id } })
            : (prisma as any).saleItem.update({
                where: { id: saleItem.id },
                data:  { quantity: { decrement: returnItem.quantity } },
              }),
          (prisma as any).product.update({
            where: { id: returnItem.productId },
            data:  { opening_stock: { increment: returnItem.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              product_id: returnItem.productId,
              type:       'RETURN',
              quantity:   returnItem.quantity,
              sale_id:    saleId,
              notes:      'Returned via POS',
            },
          }),
        ];

        if (returnItem.serialNumbers?.length > 0) {
          returnTasks.push(
            (prisma as any).serialized_products.updateMany({
              where: { serial_number: { in: returnItem.serialNumbers }, sale_item_id: saleItem.id },
              data:  {
                status:          'IN_STOCK',
                sale_item_id:    null,
                sale_invoice_id: null,
                customer_id:     null,
                sale_date:       null,
              },
            }),
          );
        }
        await Promise.all(returnTasks);
      }

      const updatedSale = await (prisma as any).sale.update({
        where: { id: saleId },
        data:  {
          total_amount: { decrement: totalRefundAmount },
          paid_amount:  { decrement: totalRefundAmount },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      if (Number(updatedSale.total_amount) <= 0) {
        await (prisma as any).sale.update({
          where: { id: saleId },
          data:  { payment_status: 'REFUNDED' },
        });
      }

      return {
        message:      'Return successful',
        refundAmount: totalRefundAmount,
        sale:         updatedSale,
      };
    }, { maxWait: 20000, timeout: 120000 });
  }

  async getAllSales() {
    return await (this.prisma as any).sale.findMany({
      orderBy: { created_at: 'desc' },
      include: { customer: true, items: { include: { product: true } } },
    });
  }

  async getSaleById(id: string) {
    const sale = await (this.prisma as any).sale.findUnique({
      where:   { id },
      include: {
        customer: true,
        items:    { include: { product: true } },
        serialized_products: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale record nahi mila!');
    return sale;
  }
}