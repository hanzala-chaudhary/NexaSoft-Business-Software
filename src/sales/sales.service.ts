import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // ─── Salesman ID resolve karo (seed se bana hua admin milega) ─────────────
  private async resolveSalesmanId(requestUserId?: string): Promise<string> {
    if (requestUserId) return requestUserId;

    // Seed se bana hua Super Admin dhundo
    const fallbackUser = await (this.prisma as any).user.findFirst({
      orderBy: { created_at: 'asc' },
    });

    if (fallbackUser) return fallbackUser.id;

    // Last resort: sahi schema se naya user banao
    let role = await (this.prisma as any).role.findFirst({
      where: { name: 'Super Admin' },
    });
    if (!role) {
      role = await (this.prisma as any).role.create({
        data: { name: 'Super Admin', is_system: true },
      });
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

    // Role assign karo
    await (this.prisma as any).user_roles.create({
      data: { user_id: newUser.id, role_id: role.id, updated_at: new Date() },
    });

    return newUser.id;
  }

  // ─── SALE CREATE ──────────────────────────────────────────────────────────
  async createSale(data: any) {
    const {
      items,
      customerId,
      customerName,
      customerPhone,
      discount = 0,
      paidAmount = 0,
      paymentMethod = 'CASH',
    } = data;

    if (!items || items.length === 0) throw new BadRequestException('Cart is empty!');

    const finalUserId = await this.resolveSalesmanId(data.userId);

    return await this.prisma.$transaction(async (prisma) => {

      // ── Customer / Khata ──────────────────────────────────────────────────
      let finalCustomerId: string | null = null;

      if (customerId) {
        finalCustomerId = customerId;
      } else if (customerPhone || (customerName && customerName !== 'Walk-in Customer')) {
        const nameToSave = customerName || 'Unknown Customer';
        if (customerPhone) {
          // phone unique nahi hai schema mein — findUnique nahi chal sakta
          const existing = await (prisma as any).customer.findFirst({
            where: { phone: customerPhone },
          });
          finalCustomerId = existing
            ? existing.id
            : (await (prisma as any).customer.create({ data: { name: nameToSave, phone: customerPhone } })).id;
        } else {
          finalCustomerId = (await (prisma as any).customer.create({ data: { name: nameToSave } })).id;
        }
      }

      // ── Price calculation ─────────────────────────────────────────────────
      let calculatedSubTotal = 0;
      for (const item of items) {
        calculatedSubTotal += Number(item.salePrice) * Number(item.quantity);
      }

      const grandTotal      = calculatedSubTotal - Number(discount);
      const finalPaidAmount = Number(paidAmount);

      let paymentStatus = 'PAID';
      if (finalPaidAmount <= 0)              paymentStatus = 'PENDING';
      else if (finalPaidAmount < grandTotal)  paymentStatus = 'PARTIAL';

      const invoiceNumber = `INV-SALE-${Date.now()}`;

      // ── Sale record ───────────────────────────────────────────────────────
      const sale = await (prisma as any).sale.create({
        data: {
          invoice_number: invoiceNumber,
          total_amount:   grandTotal,
          discount:       Number(discount),
          paid_amount:    finalPaidAmount,
          payment_status: paymentStatus,
          customer_id:    finalCustomerId,
          salesman_id:    finalUserId,
        },
      });

      // ── Payment ledger (udhaar & cash) ────────────────────────────────────
      if (finalPaidAmount > 0) {
        await (prisma as any).payment.create({
          data: {
            sale_id:          sale.id,
            salesman_id:      finalUserId,
            amount:           finalPaidAmount,
            payment_method:   paymentMethod,       // CASH / BANK_TRANSFER / CARD
            type:             'SALE_PAYMENT',
            reference_number: `REC-${invoiceNumber}`,
          },
        });
      }

      // ── Inventory & serials ───────────────────────────────────────────────
      for (const item of items) {
        const product = await (prisma as any).product.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new BadRequestException(`Product nahi mili: ${item.productId}`);

        // currentStock schema mein exist nahi karta — sirf opening_stock hai
        const stock = product.opening_stock ?? 0;
        if (Number(stock) < item.quantity) {
          throw new BadRequestException(`"${product.name}" ka stock khatam hai!`);
        }

        const saleItem = await (prisma as any).saleItem.create({
          data: {
            sale_id:    sale.id,
            product_id: item.productId,
            quantity:   item.quantity,
            sale_price: Number(item.salePrice),   // unitPrice + totalPrice ki jagah sirf sale_price
          },
        });

        const parallelTasks: Promise<any>[] = [
          (prisma as any).product.update({
            where: { id: item.productId },
            data:  { opening_stock: { decrement: item.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              product_id: item.productId,
              type:       'SALE',              // 'action' → 'type'
              quantity:   -item.quantity,
              sale_id:    sale.id,
              salesman_id: finalUserId,
              notes:      `Sold via POS — ${invoiceNumber}`,
            },
          }),
        ];

        if (item.serialNumbers?.length > 0) {
          parallelTasks.push(
            (prisma as any).productSerial.updateMany({
              where: {
                serial_number: { in: item.serialNumbers },
                product_id: item.productId,
              },
              data: {
                status:        'SOLD',
                sale_item_id:  saleItem.id,
                customer_id:   finalCustomerId,
                sale_price:    Number(item.salePrice),
                sale_date:     new Date(),
              },
            }),
          );
        }

        await Promise.all(parallelTasks);
      }

      // ── Return final sale with invoice_number for frontend ────────────────
      const finalSale = await (prisma as any).sale.findUnique({
        where:   { id: sale.id },
        include: { customer: true, items: { include: { product: true } } },
      });

      return {
        ...finalSale,
        invoice_number: finalSale.invoice_number,
      };

    }, { maxWait: 20000, timeout: 120000 });
  }

  // ─── RETURN ───────────────────────────────────────────────────────────────
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
              product_id:  returnItem.productId,
              type:        'RETURN',
              quantity:    returnItem.quantity,
              sale_id:     saleId,
              salesman_id: finalUserId,
              notes:       'Returned via POS',
            },
          }),
        ];

        if (returnItem.serialNumbers?.length > 0) {
          returnTasks.push(
            (prisma as any).productSerial.updateMany({
              where: { serial_number: { in: returnItem.serialNumbers }, sale_item_id: saleItem.id },
              data:  { status: 'IN_STOCK', sale_item_id: null, customer_id: null, sale_date: null },
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
          data:  { payment_status: 'REFUNDED', order_status: 'CANCELLED' },
        });
      }

      return {
        message:      'Return successful',
        refundAmount: totalRefundAmount,
        sale:         updatedSale,
      };

    }, { maxWait: 20000, timeout: 120000 });
  }

  // ─── QUERIES ──────────────────────────────────────────────────────────────
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