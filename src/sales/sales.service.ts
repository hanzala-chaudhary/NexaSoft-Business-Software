import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SerialStatus } from '@prisma/client';

interface SaleItemInput {
  productId: string;
  quantity: number;
  salePrice: number;
  serialNumbers?: string[];
}

interface CreateSaleInput {
  items: SaleItemInput[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discount?: number;
  paidAmount?: number;
  paymentMethod?: string; // 'CASH' | 'BANK_TRANSFER' | 'CARD' etc — plain string in this schema
  userId: string; // salesman_id
  notes?: string;
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(data: CreateSaleInput) {
    const {
      items,
      customerId,
      customerName,
      customerPhone,
      discount = 0,
      paidAmount = 0,
      paymentMethod = 'CASH',
      userId,
      notes,
    } = data;

    if (!items || items.length === 0) throw new BadRequestException('Cart khali hai!');
    if (!userId) throw new BadRequestException('User (salesman) identify nahi ho saka!');

    return this.prisma.$transaction(
      async (tx) => {
        // Customer resolve karo (find-or-create by phone) — duplicate khata rokne ke liye
        let finalCustomerId: string | null = customerId ?? null;

        if (!finalCustomerId && (customerPhone || (customerName && customerName !== 'Walk-in Customer'))) {
          const nameToSave = customerName?.trim() || 'Unknown Customer';
          if (customerPhone) {
            const existing = await tx.customer.findFirst({
              where: { phone: customerPhone.trim(), deleted_at: null },
            });
            finalCustomerId = existing
              ? existing.id
              : (await tx.customer.create({ data: { name: nameToSave, phone: customerPhone.trim() } })).id;
          } else {
            finalCustomerId = (await tx.customer.create({ data: { name: nameToSave } })).id;
          }
        }

        // Totals calculate karo
        const subTotal = items.reduce((sum, item) => sum + Number(item.salePrice) * Number(item.quantity), 0);
        const grandTotal = subTotal - Number(discount);
        if (grandTotal < 0) throw new BadRequestException('Discount total amount se zyada nahi ho sakta!');

        const finalPaidAmount = Math.min(Number(paidAmount), grandTotal);

        let paymentStatus = 'PAID';
        if (finalPaidAmount <= 0) paymentStatus = 'PENDING';
        else if (finalPaidAmount < grandTotal) paymentStatus = 'PARTIAL';

        const invoiceNumber = `INV-${Date.now()}`;

        const sale = await tx.sale.create({
          data: {
            invoice_number: invoiceNumber,
            total_amount: subTotal,
            discount: Number(discount),
            paid_amount: finalPaidAmount,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            customer_id: finalCustomerId,
            salesman_id: userId,
          },
        });

        // Har item process karo
        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new BadRequestException(`Product nahi mili: ${item.productId}`);

          const currentStock = Number(product.opening_stock);
          if (currentStock < item.quantity) {
            throw new BadRequestException(`"${product.name}" ka sirf ${currentStock} stock available hai!`);
          }

          const saleItem = await tx.saleItem.create({
            data: {
              sale_id: sale.id,
              product_id: item.productId,
              quantity: item.quantity,
              sale_price: Number(item.salePrice),
            },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { opening_stock: { decrement: item.quantity } },
          });

          await tx.inventoryTransaction.create({
            data: {
              product_id: item.productId,
              sale_id: sale.id,
              type: 'SALE',
              quantity: -item.quantity,
              reference_id: sale.id,
              notes: 'Sold via POS',
            },
          });

          if (item.serialNumbers && item.serialNumbers.length > 0) {
            await tx.serialized_products.updateMany({
              where: { serial_number: { in: item.serialNumbers }, product_id: item.productId },
              data: {
                status: SerialStatus.SOLD,
                sale_invoice_id: sale.id,
                sale_item_id: saleItem.id,
                customer_id: finalCustomerId,
                sale_date: new Date(),
              },
            });
          }
        }

        // Payment record banao agar kuch paid hua hai
        if (finalPaidAmount > 0) {
          await tx.payment.create({
            data: {
              sale_id: sale.id,
              customer_id: finalCustomerId,
              received_by: userId,
              amount: finalPaidAmount,
              method: paymentMethod,
              type: 'SALE_PAYMENT',
            },
          });
        }

        return tx.sale.findUnique({
          where: { id: sale.id },
          include: {
            customer: true,
            items: { include: { product: true, serialized_products: true } },
            payments: true,
          },
        });
      },
      { maxWait: 20000, timeout: 120000 },
    );
  }

  async processReturn(
    saleId: string,
    data: { itemsToReturn: { productId: string; quantity: number; serialNumbers?: string[] }[]; userId: string },
  ) {
    const { itemsToReturn, userId } = data;
    if (!itemsToReturn || itemsToReturn.length === 0) {
      throw new BadRequestException('Return ke liye koi item select nahi kiya!');
    }
    if (!userId) throw new BadRequestException('User identify nahi ho saka!');

    return this.prisma.$transaction(
      async (tx) => {
        let totalRefundAmount = 0;

        for (const returnItem of itemsToReturn) {
          const saleItem = await tx.saleItem.findFirst({
            where: { sale_id: saleId, product_id: returnItem.productId },
          });
          if (!saleItem || saleItem.quantity < returnItem.quantity) {
            throw new BadRequestException('Invalid return quantity!');
          }

          const refundValue = Number(saleItem.sale_price) * returnItem.quantity;
          totalRefundAmount += refundValue;

          if (saleItem.quantity === returnItem.quantity) {
            await tx.saleItem.delete({ where: { id: saleItem.id } });
          } else {
            await tx.saleItem.update({
              where: { id: saleItem.id },
              data: { quantity: { decrement: returnItem.quantity } },
            });
          }

          await tx.product.update({
            where: { id: returnItem.productId },
            data: { opening_stock: { increment: returnItem.quantity } },
          });

          await tx.inventoryTransaction.create({
            data: {
              product_id: returnItem.productId,
              sale_id: saleId,
              type: 'RETURN',
              quantity: returnItem.quantity,
              reference_id: saleId,
              notes: 'Returned by customer',
            },
          });

          if (returnItem.serialNumbers && returnItem.serialNumbers.length > 0) {
            await tx.serialized_products.updateMany({
              where: { serial_number: { in: returnItem.serialNumbers }, sale_item_id: saleItem.id },
              data: {
                status: SerialStatus.IN_STOCK,
                sale_item_id: null,
                sale_invoice_id: null,
                customer_id: null,
                sale_date: null,
              },
            });
          }
        }

        const updatedSale = await tx.sale.update({
          where: { id: saleId },
          data: {
            total_amount: { decrement: totalRefundAmount },
            paid_amount: { decrement: totalRefundAmount },
          },
          include: { items: { include: { product: true } }, customer: true },
        });

        if (Number(updatedSale.total_amount) <= 0) {
          await tx.sale.update({
            where: { id: saleId },
            data: { payment_status: 'REFUNDED', status: 'INACTIVE' },
          });
        }

        return { message: 'Return successful', refundAmount: totalRefundAmount, sale: updatedSale };
      },
      { maxWait: 20000, timeout: 120000 },
    );
  }

  async getAllSales() {
    return this.prisma.sale.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: { customer: true, items: { include: { product: true } }, payments: true },
    });
  }

  async getSaleById(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true, serialized_products: true } },
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale record nahi mila!');
    return sale;
  }
}