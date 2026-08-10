import { Injectable, NotFoundException } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
// NOTE: adjust this import path if your PrismaService lives elsewhere in the project
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto, PaymentType } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private computeStatus(total: Prisma.Decimal | number, paid: Prisma.Decimal | number): string {
    const t = Number(total);
    const p = Number(paid);
    if (p <= 0) return 'UNPAID';
    if (p >= t) return 'PAID';
    return 'PARTIAL';
  }

  // ---------------------------------------------------------------------
  // LIST + SUMMARY
  // ---------------------------------------------------------------------
  async findAll(query: QueryPaymentDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = { deleted_at: null };

    if (query.type) where.type = query.type;
    if (query.method) where.method = query.method;
    if (query.customerId) where.customer_id = query.customerId;
    if (query.supplierId) where.supplier_id = query.supplierId;

    if (query.dateFrom || query.dateTo) {
      where.created_at = {};
      if (query.dateFrom) where.created_at.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
      if (query.dateTo) where.created_at.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    }

    if (query.search) {
      where.OR = [
        { reference_number: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total, aggregates] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          supplier: { select: { id: true, name: true, phone: true } },
          sale: { select: { id: true, invoice_number: true } },
          purchase: { select: { id: true, invoice_number: true } },
        },
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const totalReceived = Number(
      aggregates.find((a) => a.type === PaymentType.CUSTOMER_RECEIPT)?._sum.amount ?? 0,
    );
    const totalPaid = Number(
      aggregates.find((a) => a.type === PaymentType.SUPPLIER_PAYMENT)?._sum.amount ?? 0,
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.payment.count({
      where: { deleted_at: null, created_at: { gte: todayStart } },
    });

    const data = rows.map((p) => ({
      id: p.id,
      type: p.type,
      amount: Number(p.amount),
      method: p.method,
      referenceNumber: p.reference_number,
      notes: p.notes,
      createdAt: p.created_at,
      party: p.customer
        ? { id: p.customer.id, name: p.customer.name, phone: p.customer.phone, kind: 'customer' }
        : p.supplier
        ? { id: p.supplier.id, name: p.supplier.name, phone: p.supplier.phone, kind: 'supplier' }
        : null,
      invoice: p.sale
        ? { id: p.sale.id, number: p.sale.invoice_number, kind: 'sale' }
        : p.purchase
        ? { id: p.purchase.id, number: p.purchase.invoice_number, kind: 'purchase' }
        : null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        totalReceived,
        totalPaid,
        netCashFlow: totalReceived - totalPaid,
        todayCount,
      },
    };
  }

  // ---------------------------------------------------------------------
  // CREATE (with FIFO allocation across outstanding invoices)
  // ---------------------------------------------------------------------
  async create(dto: CreatePaymentDto) {
    const amount = new Prisma.Decimal(dto.amount);

    if (dto.type === PaymentType.CUSTOMER_RECEIPT) {
      return this.createCustomerReceipt(dto, amount);
    }
    return this.createSupplierPayment(dto, amount);
  }

  private async createCustomerReceipt(dto: CreatePaymentDto, amount: Prisma.Decimal) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, deleted_at: null },
      });
      if (!customer) throw new NotFoundException('Customer nahi mila.');

      // Oldest unpaid/partially-paid invoices first (FIFO) so the ledger stays accurate
      const openSales = await tx.sale.findMany({
        where: { customer_id: customer.id, status: 'ACTIVE', deleted_at: null },
        orderBy: { sale_date: 'asc' },
      });

      let remaining = amount;
      const createdPayments: Payment[] = [];

      for (const sale of openSales) {
        if (remaining.lessThanOrEqualTo(0)) break;

        const due = new Prisma.Decimal(sale.total_amount).minus(sale.paid_amount);
        if (due.lessThanOrEqualTo(0)) continue;

        const alloc = Prisma.Decimal.min(remaining, due);
        const newPaid = new Prisma.Decimal(sale.paid_amount).plus(alloc);

        await tx.sale.update({
          where: { id: sale.id },
          data: { paid_amount: newPaid, payment_status: this.computeStatus(sale.total_amount, newPaid) },
        });

        const payment = await tx.payment.create({
          data: {
            customer_id: customer.id,
            sale_id: sale.id,
            amount: alloc,
            method: dto.method,
            type: dto.type,
            reference_number: dto.referenceNumber,
            notes: dto.notes,
            received_by: dto.receivedBy,
          },
        });

        createdPayments.push(payment);
        remaining = remaining.minus(alloc);
      }

      // Leftover amount (no dues left, or customer had none) is recorded as an
      // on-account / advance credit against the customer, not tied to any invoice.
      if (remaining.greaterThan(0)) {
        const advance = await tx.payment.create({
          data: {
            customer_id: customer.id,
            sale_id: null,
            amount: remaining,
            method: dto.method,
            type: dto.type,
            reference_number: dto.referenceNumber,
            notes: dto.notes ? `${dto.notes} (Advance / on-account)` : 'Advance / on-account payment',
            received_by: dto.receivedBy,
          },
        });
        createdPayments.push(advance);
      }

      return {
        message: `Payment record ho gayi (${createdPayments.length} entry).`,
        payments: createdPayments,
        appliedToInvoices: createdPayments.filter((p) => p.sale_id).length,
        advanceAmount: Number(remaining.greaterThan(0) ? remaining : 0),
      };
    });
  }

  private async createSupplierPayment(dto: CreatePaymentDto, amount: Prisma.Decimal) {
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: dto.supplierId, deleted_at: null },
      });
      if (!supplier) throw new NotFoundException('Supplier nahi mila.');

      const openPurchases = await tx.purchase.findMany({
        where: { supplier_id: supplier.id, status: 'ACTIVE', deleted_at: null },
        orderBy: { purchase_date: 'asc' },
      });

      let remaining = amount;
      const createdPayments: Payment[] = [];

      for (const purchase of openPurchases) {
        if (remaining.lessThanOrEqualTo(0)) break;

        const due = new Prisma.Decimal(purchase.total_amount).minus(purchase.paid_amount);
        if (due.lessThanOrEqualTo(0)) continue;

        const alloc = Prisma.Decimal.min(remaining, due);
        const newPaid = new Prisma.Decimal(purchase.paid_amount).plus(alloc);

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            paid_amount: newPaid,
            payment_status: this.computeStatus(purchase.total_amount, newPaid),
          },
        });

        const payment = await tx.payment.create({
          data: {
            supplier_id: supplier.id,
            purchase_id: purchase.id,
            amount: alloc,
            method: dto.method,
            type: dto.type,
            reference_number: dto.referenceNumber,
            notes: dto.notes,
            received_by: dto.receivedBy,
          },
        });

        createdPayments.push(payment);
        remaining = remaining.minus(alloc);
      }

      if (remaining.greaterThan(0)) {
        const advance = await tx.payment.create({
          data: {
            supplier_id: supplier.id,
            purchase_id: null,
            amount: remaining,
            method: dto.method,
            type: dto.type,
            reference_number: dto.referenceNumber,
            notes: dto.notes ? `${dto.notes} (Advance payment)` : 'Advance payment',
            received_by: dto.receivedBy,
          },
        });
        createdPayments.push(advance);
      }

      return {
        message: `Payment record ho gayi (${createdPayments.length} entry).`,
        payments: createdPayments,
        appliedToInvoices: createdPayments.filter((p) => p.purchase_id).length,
        advanceAmount: Number(remaining.greaterThan(0) ? remaining : 0),
      };
    });
  }

  // ---------------------------------------------------------------------
  // VOID / DELETE (reverts the linked invoice's paid_amount, never goes below 0)
  // ---------------------------------------------------------------------
  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id, deleted_at: null } });
      if (!payment) throw new NotFoundException('Payment record nahi mila.');

      if (payment.sale_id) {
        const sale = await tx.sale.findUnique({ where: { id: payment.sale_id } });
        if (sale) {
          const newPaid = Prisma.Decimal.max(
            new Prisma.Decimal(0),
            new Prisma.Decimal(sale.paid_amount).minus(payment.amount),
          );
          await tx.sale.update({
            where: { id: sale.id },
            data: { paid_amount: newPaid, payment_status: this.computeStatus(sale.total_amount, newPaid) },
          });
        }
      }

      if (payment.purchase_id) {
        const purchase = await tx.purchase.findUnique({ where: { id: payment.purchase_id } });
        if (purchase) {
          const newPaid = Prisma.Decimal.max(
            new Prisma.Decimal(0),
            new Prisma.Decimal(purchase.paid_amount).minus(payment.amount),
          );
          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              paid_amount: newPaid,
              payment_status: this.computeStatus(purchase.total_amount, newPaid),
            },
          });
        }
      }

      await tx.payment.update({ where: { id }, data: { deleted_at: new Date() } });

      return { message: 'Payment void kar di gayi aur balance update ho gaya.' };
    });
  }
}