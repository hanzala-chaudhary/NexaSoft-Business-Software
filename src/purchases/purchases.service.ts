import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async createPurchase(data: CreatePurchaseDto) {
    try {
      // Yahan humne transaction limits barha di hain (500-600 scans ke liye safe)
      const result = await this.prisma.$transaction(
        async (prisma) => {
          const purchase = await prisma.purchase.create({
            data: {
              invoice_number: `INV-${Date.now()}`,
              supplier_id: data.supplierId,
              total_amount: data.totalAmount,
              payment_status: data.paymentStatus || 'UNPAID', // Ab default "PAID" nahi, safer "UNPAID"
            },
          });

          for (const item of data.items) {
            const purchaseItem = await prisma.purchaseItem.create({
              data: {
                purchase_id: purchase.id,
                product_id: item.productId,
                quantity: item.quantity,
                cost_price: item.costPrice,
              },
            });

            await prisma.product.update({
              where: { id: item.productId },
              data: {
                opening_stock: { increment: item.quantity },
                purchasePrice: item.costPrice,
              },
            });

            await prisma.inventoryTransaction.create({
              data: {
                product_id: item.productId,
                type: 'PURCHASE',
                quantity: item.quantity,
                reference_id: purchase.id,
                notes: `Purchased from supplier`,
              },
            });

            if (item.serialNumbers && item.serialNumbers.length > 0) {
              const serialData = item.serialNumbers.map((serial: string) => ({
                product_id: item.productId,
                serial_number: serial,
                status: 'IN_STOCK' as any,
                purchase_invoice_id: purchase.id,
                purchase_item_id: purchaseItem.id,
                supplier_id: data.supplierId,
              }));

              await prisma.serialized_products.createMany({ data: serialData });
            }
          }

          return purchase;
        },
        {
          maxWait: 20000,  // Database connection wait time (20 Seconds)
          timeout: 120000, // Transaction complete hone ki limit (2 Minutes) - Excellent for 500+ items
        }
      );

      return result;
    } catch (error) {
      console.error('Purchase Transaction Error:', error);
      throw new BadRequestException('Purchase save nahi ho saki! Data check karein.');
    }
  }

  async getAllPurchases() {
    return this.prisma.purchase.findMany({
      orderBy: { created_at: 'desc' },
      include: { supplier: true, items: { include: { product: true } } },
    });
  }
}