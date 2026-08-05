import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(data: any) {
    const { 
      items, 
      customerId, 
      customerName, 
      customerPhone, 
      discount = 0, 
      paidAmount = 0 
    } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('Cart is empty! Koi product add nahi ki gayi.');
    }

    return await this.prisma.$transaction(async (prisma) => {
      let finalCustomerId: string | null = null;

      if (customerId) {
        finalCustomerId = customerId;
      } else if (customerPhone || (customerName && customerName !== 'Walk-in Customer')) {
        const nameToSave = customerName || 'Unknown Customer';
        if (customerPhone) {
          const existingCustomer = await prisma.customer.findFirst({
            where: { phone: customerPhone },
          });
          if (existingCustomer) {
            finalCustomerId = existingCustomer.id;
          } else {
            const newCustomer = await prisma.customer.create({
              data: { name: nameToSave, phone: customerPhone },
            });
            finalCustomerId = newCustomer.id;
          }
        } else {
          const newCustomer = await prisma.customer.create({
            data: { name: nameToSave },
          });
          finalCustomerId = newCustomer.id;
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

      // Using 'any' to bypass TS strict checking for your snake_case schema
      const salePayload: any = {
        invoice_number: invoiceNumber,
        total_amount: grandTotal,
        payment_status: dynamicPaymentStatus,
        customer_id: finalCustomerId,
        discount: Number(discount),
        paid_amount: finalPaidAmount
      };

      const sale = await prisma.sale.create({ data: salePayload });

      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new BadRequestException(`Product nahi mili!`);

        if (Number((product as any).opening_stock) < item.quantity) {
          throw new BadRequestException(`"${product.name}" ka stock khatam hai!`);
        }

        const saleItemPayload: any = {
          sale_id: sale.id,
          product_id: item.productId,
          quantity: item.quantity,
          sale_price: Number(item.salePrice),
        };

        const saleItem = await prisma.saleItem.create({ data: saleItemPayload });

        const parallelTasks: any[] = [
          prisma.product.update({
            where: { id: item.productId },
            data: { opening_stock: { decrement: item.quantity } } as any,
          }),
          prisma.inventoryTransaction.create({
            data: {
              product_id: item.productId,
              type: 'SALE',
              quantity: -item.quantity,
              reference_id: sale.id,
              notes: `Sold via POS Invoice ${invoiceNumber}`,
            } as any,
          })
        ];

        if (item.serialNumbers && item.serialNumbers.length > 0) {
          const serials = await (prisma as any).serialized_products.findMany({
            where: { serial_number: { in: item.serialNumbers }, product_id: item.productId },
          });

          for (const sn of item.serialNumbers) {
            const serialDb = serials.find((s: any) => s.serial_number === sn);
            if (!serialDb) throw new BadRequestException(`Serial ${sn} nahi mila!`);
            if (serialDb.status !== 'IN_STOCK') throw new BadRequestException(`Serial ${sn} pehle hi sold hai!`);
          }

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

      return await prisma.sale.findUnique({
        where: { id: sale.id },
        include: {
          customer: true,
          items: { include: { product: true } } as any,
          serialized_products: true,
        } as any,
      });
    }, 
    { maxWait: 20000, timeout: 120000 });
  }

  async processReturn(saleId: string, data: any) {
    const { itemsToReturn } = data;
    if (!itemsToReturn || itemsToReturn.length === 0) throw new BadRequestException('Koi item select nahi kiya!');

    return await this.prisma.$transaction(async (prisma) => {
      let totalRefundAmount = 0;

      for (const returnItem of itemsToReturn) {
        const saleItem = await prisma.saleItem.findFirst({
          where: { sale_id: saleId, product_id: returnItem.productId } as any,
        });

        if (!saleItem || saleItem.quantity < returnItem.quantity) {
          throw new BadRequestException('Invalid return quantity!');
        }

        const refundValue = Number((saleItem as any).sale_price) * returnItem.quantity;
        totalRefundAmount += refundValue;

        const returnTasks: any[] = [];

        if (saleItem.quantity === returnItem.quantity) {
          returnTasks.push(prisma.saleItem.delete({ where: { id: saleItem.id } }));
        } else {
          returnTasks.push(prisma.saleItem.update({
            where: { id: saleItem.id },
            data: { quantity: { decrement: returnItem.quantity } },
          }));
        }

        returnTasks.push(
          prisma.product.update({
            where: { id: returnItem.productId },
            data: { opening_stock: { increment: returnItem.quantity } } as any,
          }),
          prisma.inventoryTransaction.create({
            data: {
              product_id: returnItem.productId,
              type: 'RETURN',
              quantity: returnItem.quantity,
              reference_id: saleId,
              notes: 'Returned',
            } as any,
          })
        );

        if (returnItem.serialNumbers && returnItem.serialNumbers.length > 0) {
          returnTasks.push(
            (prisma as any).serialized_products.updateMany({
              where: { serial_number: { in: returnItem.serialNumbers }, sale_invoice_id: saleId },
              data: {
                status: 'IN_STOCK',
                sale_invoice_id: null,
                sale_item_id: null,
                customer_id: null,
                sale_date: null,
              },
            })
          );
        }
        await Promise.all(returnTasks);
      }

      const updatedSale = await prisma.sale.update({
        where: { id: saleId },
        data: { 
          total_amount: { decrement: totalRefundAmount },
          paid_amount: { decrement: totalRefundAmount } 
        } as any,
        include: { items: { include: { product: true } } as any, customer: true } as any
      });

      if (Number((updatedSale as any).total_amount) <= 0) {
         await prisma.sale.update({
           where: { id: saleId },
           data: { payment_status: 'REFUNDED' } as any
         });
      }
      return { message: "Return successful", refundAmount: totalRefundAmount, sale: updatedSale };
    }, 
    { maxWait: 20000, timeout: 120000 });
  }

  async getAllSales() {
    return await this.prisma.sale.findMany({
      orderBy: { created_at: 'desc' } as any,
      include: { customer: true, items: { include: { product: true } } as any } as any,
    });
  }

  async getSaleById(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } as any, serialized_products: true } as any,
    });
    if (!sale) throw new NotFoundException('Sale record nahi mila!');
    return sale;
  }
}