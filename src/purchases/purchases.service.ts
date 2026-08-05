import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { SerialStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async createPurchase(data: CreatePurchaseDto & { userId: string }) {
    const { supplierId, userId, items, paidAmount = 0, paymentMethod = 'CASH', notes } = data as any;

    if (!items || items.length === 0) throw new BadRequestException('Purchase mein kam se kam ek item hona chahiye!');
    if (!supplierId) throw new BadRequestException('Supplier select karna zaroori hai!');
    if (!userId) throw new BadRequestException('User identify nahi ho saka!');

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const totalAmount = items.reduce(
            (sum: number, item: any) => sum + Number(item.costPrice) * Number(item.quantity),
            0,
          );

          const finalPaidAmount = Math.min(Number(paidAmount), totalAmount);

          let paymentStatus = 'PAID';
          if (finalPaidAmount <= 0) paymentStatus = 'PENDING';
          else if (finalPaidAmount < totalAmount) paymentStatus = 'PARTIAL';

          const invoiceNumber = `PUR-${Date.now()}`;

          const purchase = await tx.purchase.create({
            data: {
              invoice_number: invoiceNumber,
              supplier_id: supplierId,
              total_amount: totalAmount,
              paid_amount: finalPaidAmount,
              payment_method: paymentMethod,
              payment_status: paymentStatus,
            },
          });

          for (const item of items) {
            const purchaseItem = await tx.purchaseItem.create({
              data: {
                purchase_id: purchase.id,
                product_id: item.productId,
                quantity: item.quantity,
                cost_price: Number(item.costPrice),
              },
            });

            await tx.product.update({
              where: { id: item.productId },
              data: {
                opening_stock: { increment: item.quantity },
                purchasePrice: Number(item.costPrice),
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                product_id: item.productId,
                purchase_id: purchase.id,
                type: 'PURCHASE',
                quantity: item.quantity,
                reference_id: purchase.id,
                notes: 'Purchased from supplier',
              },
            });

            if (item.serialNumbers && item.serialNumbers.length > 0) {
              await tx.serialized_products.createMany({
                data: item.serialNumbers.map((serial: string) => ({
                  serial_number: serial,
                  product_id: item.productId,
                  purchase_item_id: purchaseItem.id,
                  purchase_invoice_id: purchase.id,
                  supplier_id: supplierId,
                  purchase_date: new Date(),
                  status: SerialStatus.IN_STOCK,
                })),
              });
            }
          }

          if (finalPaidAmount > 0) {
            await tx.payment.create({
              data: {
                purchase_id: purchase.id,
                supplier_id: supplierId,
                received_by: userId,
                amount: finalPaidAmount,
                method: paymentMethod,
                type: 'PURCHASE_PAYMENT',
              },
            });
          }

          return tx.purchase.findUnique({
            where: { id: purchase.id },
            include: { supplier: true, items: { include: { product: true } }, payments: true },
          });
        },
        { maxWait: 20000, timeout: 120000 },
      );
    } catch (error) {
      console.error('Purchase Transaction Error:', error);
      throw new BadRequestException('Purchase save nahi ho saki! Data check karein.');
    }
  }

  async getAllPurchases() {
    return this.prisma.purchase.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: { supplier: true, items: { include: { product: true } }, payments: true },
    });
  }

  async getPurchaseById(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true, serialized_products: true } },
        payments: true,
      },
    });
    if (!purchase) throw new NotFoundException('Purchase record nahi mila!');
    return purchase;
  }
}