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
      paymentMethod = 'CASH',   // ← FIX: frontend se aane wala method
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
          const existing = await (prisma as any).customer.findUnique({
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

      const grandTotal       = calculatedSubTotal - Number(discount);
      const finalPaidAmount  = Number(paidAmount);

      let paymentStatus = 'PAID';
      if (finalPaidAmount <= 0)            paymentStatus = 'PENDING';
      else if (finalPaidAmount < grandTotal) paymentStatus = 'PARTIAL';

      const invoiceNumber = `INV-SALE-${Date.now()}`;

      // ── Sale record ───────────────────────────────────────────────────────
      const sale = await (prisma as any).sale.create({
        data: {
          invoiceNumber,
          totalAmount:   grandTotal,
          discount:      Number(discount),
          paidAmount:    finalPaidAmount,
          paymentStatus,
          customerId:    finalCustomerId,
          userId:        finalUserId,
        },
      });

      // ── Payment ledger (udhaar & cash) ────────────────────────────────────
      if (finalPaidAmount > 0) {
        await (prisma as any).payment.create({
          data: {
            saleId:          sale.id,
            userId:          finalUserId,
            amount:          finalPaidAmount,
            method:          paymentMethod,       // ← FIX: CASH / BANK_TRANSFER / CARD
            type:            'SALE_PAYMENT',
            referenceNumber: `REC-${invoiceNumber}`,
          },
        });
      }

      // ── Inventory & serials ───────────────────────────────────────────────
      for (const item of items) {
        const product = await (prisma as any).product.findUnique({
          where: { id: item.productId },
        });
        if (!product) throw new BadRequestException(`Product nahi mili: ${item.productId}`);

        const stock = product.currentStock ?? product.current_stock ?? product.opening_stock ?? 0;
        if (Number(stock) < item.quantity) {
          throw new BadRequestException(`"${product.name}" ka stock khatam hai!`);
        }

        const saleItem = await (prisma as any).saleItem.create({
          data: {
            saleId:     sale.id,
            productId:  item.productId,
            quantity:   item.quantity,
            unitPrice:  Number(item.salePrice),
            totalPrice: Number(item.salePrice) * item.quantity,
          },
        });

        const stockField = product.currentStock !== undefined ? 'currentStock' : 'opening_stock';

        const parallelTasks: Promise<any>[] = [
          (prisma as any).product.update({
            where: { id: item.productId },
            data:  { [stockField]: { decrement: item.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              productId: item.productId,
              action:    'SALE',
              quantity:  -item.quantity,
              saleId:    sale.id,
              userId:    finalUserId,
              notes:     `Sold via POS — ${invoiceNumber}`,
            },
          }),
        ];

        if (item.serialNumbers?.length > 0) {
          parallelTasks.push(
            (prisma as any).productSerial.updateMany({
              where: {
                serialNumber: { in: item.serialNumbers },
                productId: item.productId,
              },
              data: {
                status:     'SOLD',
                saleItemId: saleItem.id,
                customerId: finalCustomerId,
                salePrice:  Number(item.salePrice),
                saleDate:   new Date(),
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

      // Frontend invoice_number expect karta hai (snake_case)
      return {
        ...finalSale,
        invoice_number: finalSale.invoiceNumber,
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
          where: { saleId, productId: returnItem.productId },
        });

        if (!saleItem || saleItem.quantity < returnItem.quantity) {
          throw new BadRequestException('Invalid return quantity!');
        }

        const unitPrice  = saleItem.salePrice ?? saleItem.unitPrice ?? 0;
        const refundValue = Number(unitPrice) * returnItem.quantity;
        totalRefundAmount += refundValue;

        const product = await (prisma as any).product.findUnique({
          where: { id: returnItem.productId },
        });
        const stockField = product?.currentStock !== undefined ? 'currentStock' : 'opening_stock';

        const returnTasks: Promise<any>[] = [
          saleItem.quantity === returnItem.quantity
            ? (prisma as any).saleItem.delete({ where: { id: saleItem.id } })
            : (prisma as any).saleItem.update({
                where: { id: saleItem.id },
                data:  { quantity: { decrement: returnItem.quantity }, totalPrice: { decrement: refundValue } },
              }),
          (prisma as any).product.update({
            where: { id: returnItem.productId },
            data:  { [stockField]: { increment: returnItem.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              productId: returnItem.productId,
              action:    'RETURN',
              quantity:  returnItem.quantity,
              saleId,
              userId:    finalUserId,
              notes:     'Returned via POS',
            },
          }),
        ];

        if (returnItem.serialNumbers?.length > 0) {
          returnTasks.push(
            (prisma as any).productSerial.updateMany({
              where: { serialNumber: { in: returnItem.serialNumbers }, saleItemId: saleItem.id },
              data:  { status: 'IN_STOCK', saleItemId: null, customerId: null, saleDate: null },
            }),
          );
        }

        await Promise.all(returnTasks);
      }

      const updatedSale = await (prisma as any).sale.update({
        where: { id: saleId },
        data:  {
          totalAmount: { decrement: totalRefundAmount },
          paidAmount:  { decrement: totalRefundAmount },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      if (Number(updatedSale.totalAmount) <= 0) {
        await (prisma as any).sale.update({
          where: { id: saleId },
          data:  { paymentStatus: 'REFUNDED', orderStatus: 'CANCELLED' },
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
      orderBy: { createdAt: 'desc' },
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