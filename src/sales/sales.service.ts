import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(data: any) {
    const { totalAmount, paymentStatus, customerId, customerName, customerPhone, items } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('Cart is empty! Koi product add nahi ki gayi.');
    }

    // ULTRA-FAST TRANSACTION WITH EXTENDED TIMEOUT
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

      const invoiceNumber = `INV-SALE-${Date.now()}`;

      const sale = await prisma.sale.create({
        data: {
          invoice_number: invoiceNumber,
          total_amount: Number(totalAmount),
          payment_status: paymentStatus || 'PAID',
          customer_id: finalCustomerId,
        },
      });

      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new BadRequestException(`Product ID ${item.productId} nahi mili!`);

        if (Number(product.opening_stock) < item.quantity) {
          throw new BadRequestException(`"${product.name}" ka stock khatam hai! Available: ${product.opening_stock}`);
        }

        const saleItem = await prisma.saleItem.create({
          data: {
            sale_id: sale.id,
            product_id: item.productId,
            quantity: item.quantity,
            sale_price: Number(item.salePrice),
          },
        });

        // PARALLEL EXECUTION FOR SPEED (No waiting line-by-line)
        const parallelTasks: any[] = [
          prisma.product.update({
            where: { id: item.productId },
            data: { opening_stock: { decrement: item.quantity } },
          }),
          prisma.inventoryTransaction.create({
            data: {
              product_id: item.productId,
              type: 'SALE',
              quantity: -item.quantity,
              reference_id: sale.id,
              notes: `Sold via Invoice ${invoiceNumber}`,
            },
          })
        ];

        if (item.serialNumbers && item.serialNumbers.length > 0) {
          const serials = await prisma.serialized_products.findMany({
            where: { serial_number: { in: item.serialNumbers }, product_id: item.productId },
          });

          for (const sn of item.serialNumbers) {
            const serialDb = serials.find((s) => s.serial_number === sn);
            if (!serialDb) throw new BadRequestException(`Serial ${sn} database mein nahi mila!`);
            if (serialDb.status !== 'IN_STOCK') throw new BadRequestException(`Serial ${sn} pehle hi ${serialDb.status} hai!`);
          }

          parallelTasks.push(
            prisma.serialized_products.updateMany({
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

        // Fire all update tasks for this item at the exact same time
        await Promise.all(parallelTasks);
      }

      return await prisma.sale.findUnique({
        where: { id: sale.id },
        include: {
          customer: true,
          items: { include: { product: true } },
          serialized_products: true,
        },
      });
    }, 
    { maxWait: 20000, timeout: 120000 }); // Fixes P2028 Error (Allows 500+ items easily)
  }

  // --- RETURN LOGIC ---
  async processReturn(saleId: string, data: any) {
    const { itemsToReturn } = data;
    
    if (!itemsToReturn || itemsToReturn.length === 0) {
      throw new BadRequestException('Return ke liye koi item select nahi kiya!');
    }

    return await this.prisma.$transaction(async (prisma) => {
      let totalRefundAmount = 0;

      for (const returnItem of itemsToReturn) {
        const saleItem = await prisma.saleItem.findFirst({
          where: { sale_id: saleId, product_id: returnItem.productId },
        });

        if (!saleItem || saleItem.quantity < returnItem.quantity) {
          throw new BadRequestException('Aap utni quantity return nahi kar sakte jitni sale nahi hui!');
        }

        const refundValue = Number(saleItem.sale_price) * returnItem.quantity;
        totalRefundAmount += refundValue;

        // PARALLEL EXECUTION FOR SPEED (Returns)
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
            data: { opening_stock: { increment: returnItem.quantity } },
          }),
          prisma.inventoryTransaction.create({
            data: {
              product_id: returnItem.productId,
              type: 'RETURN',
              quantity: returnItem.quantity,
              reference_id: saleId,
              notes: 'Item returned from customer',
            },
          })
        );

        if (returnItem.serialNumbers && returnItem.serialNumbers.length > 0) {
          returnTasks.push(
            prisma.serialized_products.updateMany({
              where: {
                serial_number: { in: returnItem.serialNumbers },
                sale_invoice_id: saleId,
              },
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
        data: { total_amount: { decrement: totalRefundAmount } },
        include: {
          items: { include: { product: true } },
          serialized_products: true,
          customer: true
        }
      });

      if (Number(updatedSale.total_amount) === 0) {
         await prisma.sale.update({
           where: { id: saleId },
           data: { payment_status: 'REFUNDED' }
         });
      }

      return { message: "Return successful", refundAmount: totalRefundAmount, sale: updatedSale };
    }, 
    { maxWait: 20000, timeout: 120000 }); // Fixes Timeout Error on bulk returns
  }

  async getAllSales() {
    return await this.prisma.sale.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  async getSaleById(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        serialized_products: true,
      },
    });

    if (!sale) throw new NotFoundException('Sale record nahi mila!');
    return sale;
  }
}