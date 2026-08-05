import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePaymentDto & { userId: string }) {
    const { saleId, purchaseId, amount, method = 'CASH', type, referenceNumber, notes, userId } = data;

    if (!saleId && !purchaseId) {
      throw new BadRequestException('Payment ke liye Sale ya Purchase mein se koi ek zaroori hai!');
    }
    if (saleId && purchaseId) {
      throw new BadRequestException('Payment sirf Sale ya Purchase mein se ek ke against ho sakti hai!');
    }

    return this.prisma.$transaction(async (tx) => {
      let customerId: string | null = null;
      let supplierId: string | null = null;

      if (saleId) {
        const sale = await tx.sale.findUnique({ where: { id: saleId } });
        if (!sale) throw new NotFoundException('Sale record nahi mila!');

        const grandTotal = Number(sale.total_amount) - Number(sale.discount);
        const newPaidAmount = Number(sale.paid_amount) + Number(amount);

        if (newPaidAmount > grandTotal) {
          throw new BadRequestException(
            `Payment amount zyada hai! Baqaya sirf Rs. ${(grandTotal - Number(sale.paid_amount)).toFixed(2)} hai.`,
          );
        }

        let newStatus = 'PAID';
        if (newPaidAmount <= 0) newStatus = 'PENDING';
        else if (newPaidAmount < grandTotal) newStatus = 'PARTIAL';

        await tx.sale.update({
          where: { id: saleId },
          data: { paid_amount: newPaidAmount, payment_status: newStatus },
        });

        customerId = sale.customer_id;
      }

      if (purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
        if (!purchase) throw new NotFoundException('Purchase record nahi mila!');

        const newPaidAmount = Number(purchase.paid_amount) + Number(amount);

        if (newPaidAmount > Number(purchase.total_amount)) {
          throw new BadRequestException(
            `Payment amount zyada hai! Baqaya sirf Rs. ${(Number(purchase.total_amount) - Number(purchase.paid_amount)).toFixed(2)} hai.`,
          );
        }

        let newStatus = 'PAID';
        if (newPaidAmount <= 0) newStatus = 'PENDING';
        else if (newPaidAmount < Number(purchase.total_amount)) newStatus = 'PARTIAL';

        await tx.purchase.update({
          where: { id: purchaseId },
          data: { paid_amount: newPaidAmount, payment_status: newStatus },
        });

        supplierId = purchase.supplier_id;
      }

      return tx.payment.create({
        data: {
          sale_id: saleId || null,
          purchase_id: purchaseId || null,
          customer_id: customerId,
          supplier_id: supplierId,
          received_by: userId,
          amount,
          method,
          type,
          reference_number: referenceNumber,
          notes,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.payment.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: { sale: true, purchase: true, customer: true, supplier: true },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { sale: true, purchase: true, customer: true, supplier: true },
    });
    if (!payment) throw new NotFoundException('Payment record nahi mila!');
    return payment;
  }
}