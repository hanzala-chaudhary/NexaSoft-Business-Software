import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // ─── Salesman ID resolve karo (seed se bana hua admin milega) ─────────────
  private async resolveSalesmanId(requestUserId?: string): Promise<string> {
    if (requestUserId) return requestUserId;

    // User model mein createdAt @map("created_at") hai — client field abhi bhi
    // camelCase "createdAt" hi hai, DB column snake_case hai.
    const fallbackUser = await (this.prisma as any).user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (fallbackUser) return fallbackUser.id;

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
          // Customer.phone unique nahi hai schema mein — findFirst use karo
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
          payment_method: paymentMethod,   // Sale khud bhi payment_method rakhta hai
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
            received_by:      finalUserId,       // Payment model mein field "received_by" hai, "salesman_id" nahi
            amount:           finalPaidAmount,
            method:           paymentMethod,      // Payment ka field literally "method" hai, "payment_method" nahi
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

        const stock = product.opening_stock ?? 0;
        if (Number(stock) < item.quantity) {
          throw new BadRequestException(`"${product.name}" ka stock khatam hai!`);
        }

        const saleItem = await (prisma as any).saleItem.create({
          data: {
            sale_id:    sale.id,
            product_id: item.productId,
            quantity:   item.quantity,
            sale_price: Number(item.salePrice),
          },
        });

        const parallelTasks: Promise<any>[] = [
          (prisma as any).product.update({
            where: { id: item.productId },
            data:  { opening_stock: { decrement: item.quantity } },
          }),
          // InventoryTransaction model mein koi user/salesman field hi nahi hai
          (prisma as any).inventoryTransaction.create({
            data: {
              product_id: item.productId,
              type:       'SALE',
              quantity:   -item.quantity,
              sale_id:    sale.id,
              notes:      `Sold via POS — ${invoiceNumber}`,
            },
          }),
        ];

        if (item.serialNumbers?.length > 0) {
          parallelTasks.push(
            // Model ka naam "serialized_products" hai, "productSerial" nahi
            (prisma as any).serialized_products.updateMany({
              where: {
                serial_number: { in: item.serialNumbers },
                product_id: item.productId,
              },
              data: {
                status:          'SOLD',
                sale_invoice_id: sale.id,
                sale_item_id:    saleItem.id,
                customer_id:     finalCustomerId,
                sale_date:       new Date(),
                // Note: is model mein "sale_price" field exist hi nahi karta — hata diya
              },
            }),
          );
        }

        await Promise.all(parallelTasks);
      }

      const finalSale = await (prisma as any).sale.findUnique({
        where:   { id: sale.id },
        include: { customer: true, items: { include: { product: true } } },
      });

      return finalSale; // Sale.invoice_number pehle se hi snake_case hai, extra mapping ki zaroorat nahi
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
        // NOTE: schema mein Sale par "order_status" field exist nahi karta.
        // Sirf payment_status update kar raha hoon. Agar sale ko "cancelled" mark
        // karna hai to bata do — RecordStatus enum (ACTIVE/INACTIVE/DRAFT/ARCHIVED)
        // mein se koi status use karna hoga ya migration se naya field add karna hoga.
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