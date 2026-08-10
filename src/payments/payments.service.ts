import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// NOTE: adjust this import path if your PrismaService lives elsewhere in the project
import { PrismaService } from '../prisma/prisma.service';
import { QueryPaymentDto } from './dto/query-payment.dto';

/**
 * IMPORTANT — this module is intentionally READ-ONLY.
 *
 * Actual payment recording + FIFO invoice allocation already lives in:
 *   - CustomersService.receivePayment() / CustomersService.voidPayment()
 *   - SuppliersService.paySupplier()   / SuppliersService.voidPayment()
 *
 * This service only aggregates that same `Payment` table for a unified
 * Payments screen. It must never re-implement create/void logic — doing so
 * created two parallel systems that silently drifted out of sync (wrong
 * badges, missing party names). Keep this file read-only.
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPaymentDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Filters that apply regardless of direction (money in / money out)
    const baseConditions: Prisma.PaymentWhereInput[] = [{ deleted_at: null }];

    if (query.method) baseConditions.push({ method: query.method });
    if (query.customerId) baseConditions.push({ customer_id: query.customerId });
    if (query.supplierId) baseConditions.push({ supplier_id: query.supplierId });

    if (query.dateFrom || query.dateTo) {
      const range: { gte?: Date; lte?: Date } = {};
      if (query.dateFrom) range.gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
      if (query.dateTo) range.lte = new Date(`${query.dateTo}T23:59:59.999Z`);
      baseConditions.push({ created_at: range });
    }

    if (query.search) {
      baseConditions.push({
        OR: [
          { reference_number: { contains: query.search, mode: 'insensitive' } },
          { notes: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
          { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
          { sale: { customer: { name: { contains: query.search, mode: 'insensitive' } } } },
          { purchase: { supplier: { name: { contains: query.search, mode: 'insensitive' } } } },
        ],
      });
    }

    // Direction is derived from WHICH relation is populated (customer/sale vs
    // supplier/purchase) rather than the raw `type` string — different code
    // paths in the app write different type values, but only one side of the
    // relation is ever set, which makes this reliable everywhere.
    const receivedFilter: Prisma.PaymentWhereInput = {
      OR: [{ customer_id: { not: null } }, { sale_id: { not: null } }],
    };
    const paidFilter: Prisma.PaymentWhereInput = {
      OR: [{ supplier_id: { not: null } }, { purchase_id: { not: null } }],
    };

    const listConditions = [...baseConditions];
    if (query.type === 'CUSTOMER_RECEIPT') listConditions.push(receivedFilter);
    else if (query.type === 'SUPPLIER_PAYMENT') listConditions.push(paidFilter);

    const where: Prisma.PaymentWhereInput = { AND: listConditions };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          supplier: { select: { id: true, name: true, phone: true } },
          sale: {
            select: {
              id: true,
              invoice_number: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          purchase: {
            select: {
              id: true,
              invoice_number: true,
              supplier: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    // Summary totals respect the same filters (search/date/method) but ignore the
    // type toggle, so the cards always show the full received-vs-paid picture.
    const [receivedAgg, paidAgg, todayCount] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { AND: [...baseConditions, receivedFilter] },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { AND: [...baseConditions, paidFilter] },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { deleted_at: null, created_at: { gte: this.startOfToday() } },
      }),
    ]);

    const totalReceived = Number(receivedAgg._sum.amount ?? 0);
    const totalPaid = Number(paidAgg._sum.amount ?? 0);

    return {
      data: rows.map((p) => this.toListItem(p)),
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

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private toListItem(p: any) {
    const isReceived = Boolean(p.customer_id || p.sale_id);

    // Prefer the direct relation; fall back to the invoice's own relation for
    // payments created by other code paths that only set sale_id/purchase_id
    // (e.g. an initial payment taken at the time of sale).
    const party = p.customer
      ? { id: p.customer.id, name: p.customer.name, phone: p.customer.phone, kind: 'customer' as const }
      : p.supplier
      ? { id: p.supplier.id, name: p.supplier.name, phone: p.supplier.phone, kind: 'supplier' as const }
      : p.sale?.customer
      ? {
          id: p.sale.customer.id,
          name: p.sale.customer.name,
          phone: p.sale.customer.phone,
          kind: 'customer' as const,
        }
      : p.purchase?.supplier
      ? {
          id: p.purchase.supplier.id,
          name: p.purchase.supplier.name,
          phone: p.purchase.supplier.phone,
          kind: 'supplier' as const,
        }
      : null;

    const invoice = p.sale
      ? { id: p.sale.id, number: p.sale.invoice_number, kind: 'sale' as const }
      : p.purchase
      ? { id: p.purchase.id, number: p.purchase.invoice_number, kind: 'purchase' as const }
      : null;

    return {
      id: p.id,
      type: isReceived ? 'CUSTOMER_RECEIPT' : 'SUPPLIER_PAYMENT',
      amount: Number(p.amount),
      method: p.method,
      referenceNumber: p.reference_number,
      notes: p.notes,
      createdAt: p.created_at,
      party,
      invoice,
    };
  }
}