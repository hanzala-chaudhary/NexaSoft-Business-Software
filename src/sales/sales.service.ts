import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(data: any) {
    const { items, customerId, customerName, customerPhone, discount = 0, paidAmount = 0 } = data;

    if (!items || items.length === 0) throw new BadRequestException('Cart is empty!');

    return await this.prisma.$transaction(async (prisma) => {
      let finalCustomerId: string | null = null;

      if (customerId) {
        finalCustomerId = customerId;
      } else if (customerPhone || (customerName && customerName !== 'Walk-in Customer')) {
        const nameToSave = customerName || 'Unknown Customer';
        if (customerPhone) {
          const existing = await (prisma as any).customer.findFirst({ where: { phone: customerPhone } });
          if (existing) finalCustomerId = existing.id;
          else {
            const newCust = await (prisma as any).customer.create({ data: { name: nameToSave, phone: customerPhone } });
            finalCustomerId = newCust.id;
          }
        } else {
          const newCust = await (prisma as any).customer.create({ data: { name: nameToSave } });
          finalCustomerId = newCust.id;
        }
      }

      let calculatedSubTotal = 0;
      for (const item of items) {
        calculatedSubTotal += Number(item.salePrice) * Number(item.quantity);
      }

      const grandTotal = calculatedSubTotal - Number(discount);
      const finalPaidAmount = Number(paidAmount);
      
      let dynamicPaymentStatus = 'PAID';
      if (finalPaidAmount <= 0) dynamicPaymentStatus = 'PENDING';
      else if (finalPaidAmount < grandTotal) dynamicPaymentStatus = 'PARTIAL';

      const invoiceNumber = `INV-SALE-${Date.now()}`;

      const sale = await (prisma as any).sale.create({
        data: {
          invoice_number: invoiceNumber,
          total_amount: grandTotal, 
          discount: Number(discount),
          paid_amount: finalPaidAmount,
          payment_status: dynamicPaymentStatus,
          customer_id: finalCustomerId,
        },
      });

      for (const item of items) {
        const product = await (prisma as any).product.findUnique({ where: { id: item.productId } });
        if (!product) throw new BadRequestException(`Product nahi mili!`);
        
        const stock = product.opening_stock ?? product.current_stock ?? 0;
        if (Number(stock) < item.quantity) throw new BadRequestException(`Stock khatam hai!`);

        const saleItem = await (prisma as any).saleItem.create({
          data: {
            sale_id: sale.id,
            product_id: item.productId,
            quantity: item.quantity,
            sale_price: Number(item.salePrice),
            unit_price: Number(item.salePrice),
            total_price: Number(item.salePrice) * item.quantity,
          },
        });

        const parallelTasks: any[] = [
          (prisma as any).product.update({
            where: { id: item.productId },
            data: product.opening_stock !== undefined 
                  ? { opening_stock: { decrement: item.quantity } } 
                  : { current_stock: { decrement: item.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              product_id: item.productId,
              type: 'SALE',
              action: 'SALE',
              quantity: -item.quantity,
              sale_id: sale.id,
              reference_id: sale.id,
              notes: `Sold via POS`,
            },
          })
        ];

        if (item.serialNumbers && item.serialNumbers.length > 0) {
          parallelTasks.push(
            (prisma as any).serialized_products.updateMany({
              where: { serial_number: { in: item.serialNumbers }, product_id: item.productId },
              data: {
                status: 'SOLD',
                sale_invoice_id: sale.id,
                sale_item_id: saleItem.id,
                customer_id: finalCustomerId,
                sale_date: new Date(),
              },
            })
          );
        }
        await Promise.all(parallelTasks);
      }

      return await (prisma as any).sale.findUnique({
        where: { id: sale.id },
        include: { customer: true, items: { include: { product: true } } },
      });
    }, { maxWait: 20000, timeout: 120000 });
  }

  async processReturn(saleId: string, data: any) {
    const { itemsToReturn } = data;
    if (!itemsToReturn || itemsToReturn.length === 0) throw new BadRequestException('Return ke liye koi item select nahi kiya!');

    return await this.prisma.$transaction(async (prisma) => {
      let totalRefundAmount = 0;

      for (const returnItem of itemsToReturn) {
        const saleItem = await (prisma as any).saleItem.findFirst({
          where: { sale_id: saleId, product_id: returnItem.productId },
        });

        if (!saleItem || saleItem.quantity < returnItem.quantity) throw new BadRequestException('Invalid return quantity!');

        const unitPrice = saleItem.sale_price ?? saleItem.unit_price ?? 0;
        const refundValue = Number(unitPrice) * returnItem.quantity;
        totalRefundAmount += refundValue;

        const returnTasks: any[] = [];

        if (saleItem.quantity === returnItem.quantity) {
          returnTasks.push((prisma as any).saleItem.delete({ where: { id: saleItem.id } }));
        } else {
          returnTasks.push((prisma as any).saleItem.update({
            where: { id: saleItem.id },
            data: { quantity: { decrement: returnItem.quantity }, total_price: { decrement: refundValue } },
          }));
        }

        const product = await (prisma as any).product.findUnique({ where: { id: returnItem.productId } });
        
        returnTasks.push(
          (prisma as any).product.update({
            where: { id: returnItem.productId },
            data: product.opening_stock !== undefined 
                  ? { opening_stock: { increment: returnItem.quantity } }
                  : { current_stock: { increment: returnItem.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              product_id: returnItem.productId,
              type: 'RETURN',
              action: 'RETURN',
              quantity: returnItem.quantity,
              sale_id: saleId,
              reference_id: saleId,
              notes: 'Returned',
            },
          })
        );

        if (returnItem.serialNumbers && returnItem.serialNumbers.length > 0) {
          returnTasks.push(
            (prisma as any).serialized_products.updateMany({
              where: { serial_number: { in: returnItem.serialNumbers }, sale_item_id: saleItem.id },
              data: { status: 'IN_STOCK', sale_item_id: null, sale_invoice_id: null, customer_id: null, sale_date: null },
            })
          );
        }
        await Promise.all(returnTasks);
      }

      const updatedSale = await (prisma as any).sale.update({
        where: { id: saleId },
        data: { total_amount: { decrement: totalRefundAmount }, paid_amount: { decrement: totalRefundAmount } },
        include: { items: { include: { product: true } }, customer: true }
      });

      if (Number(updatedSale.total_amount) <= 0) {
         await (prisma as any).sale.update({ where: { id: saleId }, data: { payment_status: 'REFUNDED', order_status: 'CANCELLED' } });
      }
      return { message: "Return successful", refundAmount: totalRefundAmount, sale: updatedSale };
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
      where: { id },
      include: { customer: true, items: { include: { product: true } }, serialized_products: true },
    });
    if (!sale) throw new NotFoundException('Sale record nahi mila!');
    return sale;
  }
}