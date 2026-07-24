import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  // 1. Nayi Purchase Create Karna (With Serial Numbers & Stock Update)
  async createPurchase(data: any) {
    try {
      // Prisma Transaction: Ya toh saaray kaam honge, ya koi aik bhi nahi hoga
      const result = await this.prisma.$transaction(async (prisma) => {
        
        // Step 1: Main Purchase Invoice banayen
        const purchase = await prisma.purchase.create({
          data: {
            invoice_number: `INV-${Date.now()}`,
            supplier_id: data.supplierId,
            total_amount: data.totalAmount,
            payment_status: data.paymentStatus || 'PAID',
          },
        });

        // Step 2: Har Product (Item) ko process karein
        for (const item of data.items) {
          // A. Purchase Item save karein
          const purchaseItem = await prisma.purchaseItem.create({
            data: {
              purchase_id: purchase.id,
              product_id: item.productId,
              quantity: item.quantity,
              cost_price: item.costPrice,
            },
          });

          // B. Product ka Stock Barhayen (Update)
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              opening_stock: { increment: item.quantity },
              purchasePrice: item.costPrice, // Nayi khareed par cost update kar dein
            },
          });

          // C. Inventory Transaction Log banayen
          await prisma.inventoryTransaction.create({
            data: {
              product_id: item.productId,
              type: 'PURCHASE',
              quantity: item.quantity,
              reference_id: purchase.id,
              notes: `Purchased from supplier`,
            },
          });

          // D. Serial Numbers Save Karein (Agar is product ke serial numbers diye gaye hain)
          if (item.serialNumbers && item.serialNumbers.length > 0) {
            const serialData = item.serialNumbers.map((serial: string) => ({
              product_id: item.productId,
              serial_number: serial,
              status: 'IN_STOCK' as any,
              purchase_invoice_id: purchase.id,
              purchase_item_id: purchaseItem.id,
              supplier_id: data.supplierId,
            }));

            await prisma.serialized_products.createMany({
              data: serialData,
            });
          }
        }

        return purchase;
      });

      return result;
    } catch (error) {
      console.error("Purchase Transaction Error:", error);
      throw new BadRequestException("Purchase save nahi ho saki! Data check karein.");
    }
  }

  // 2. Sari Purchases Get Karna
  async getAllPurchases() {
    return this.prisma.purchase.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          }
        }
      }
    });
  }
}