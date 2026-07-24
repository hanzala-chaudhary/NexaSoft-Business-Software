import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  // Nayi Sale (Bill) Create Karna
  async createSale(data: any) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        
        // 1. Main Sale Invoice (Bill) banayen
        const sale = await prisma.sale.create({
          data: {
            invoice_number: `INV-SALE-${Date.now()}`,
            customer_id: data.customerId || null,
            total_amount: data.totalAmount,
            discount: data.discount || 0,
            payment_status: data.paymentStatus || 'PAID',
          },
        });

        // 2. Har Product (Item) ko process karein
        for (const item of data.items) {
          // A. Sale Item save karein
          const saleItem = await prisma.saleItem.create({
            data: {
              sale_id: sale.id,
              product_id: item.productId,
              quantity: item.quantity,
              sale_price: item.salePrice,
            },
          });

          // B. Product ka Stock MINUS (Kam) Karein
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              opening_stock: { decrement: item.quantity }, // Stock kam ho raha hai
            },
          });

          // C. Inventory Transaction Log banayen
          await prisma.inventoryTransaction.create({
            data: {
              product_id: item.productId,
              type: 'SALE',
              quantity: item.quantity,
              reference_id: sale.id,
              notes: `Sold to customer`,
            },
          });

          // D. Serial Numbers ko 'SOLD' mark karein
          if (item.serialNumbers && item.serialNumbers.length > 0) {
            await prisma.serialized_products.updateMany({
              where: {
                serial_number: { in: item.serialNumbers },
                product_id: item.productId,
              },
              data: {
                status: 'SOLD',
                sale_invoice_id: sale.id,
                sale_item_id: saleItem.id,
                customer_id: data.customerId || null,
                sale_date: new Date(),
              },
            });
          }
        }

        return sale;
      });

      return result;
    } catch (error) {
      console.error("Sale Transaction Error:", error);
      throw new BadRequestException("Sale create nahi ho saki! Data check karein.");
    }
  }

  // Sari Sales (Invoices) Get Karna
  async getAllSales() {
    return this.prisma.sale.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          }
        }
      }
    });
  }
}