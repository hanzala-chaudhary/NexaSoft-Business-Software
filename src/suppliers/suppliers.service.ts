import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '@prisma/client';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // ─── CustomersService jaisa hi fallback — agar userId na aaye to seed se bana
  // hua admin use kar lo (Payment.received_by nullable hai, phir bhi consistent rehne ke liye) ──
  private async resolveSalesmanId(requestUserId?: string): Promise<string> {
    if (requestUserId) return requestUserId;

    const fallbackUser = await (this.prisma as any).user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (fallbackUser) return fallbackUser.id;

    let role = await (this.prisma as any).role.findFirst({ where: { name: 'Super Admin' } });
    if (!role) {
      role = await (this.prisma as any).role.create({ data: { name: 'Super Admin', is_system: true } });
    }

    const newUser = await (this.prisma as any).user.create({
      data: {
        first_name: 'POS',
        last_name: 'Admin',
        email: 'admin@nexasoft.com',
        password_hash: await bcrypt.hash('Admin@123', 10),
        is_super_admin: true,
        status: 'ACTIVE',
      },
    });
    await (this.prisma as any).user_roles.create({
      data: { user_id: newUser.id, role_id: role.id, updated_at: new Date() },
    });
    return newUser.id;
  }

  async create(data: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: {
          name: data.name.trim(),
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          address: data.address?.trim() || null,
          company: data.company?.trim() || null,
        },
      });
    } catch (error) {
      console.error('Supplier Create Error:', error);
      throw new BadRequestException('Supplier save nahi ho saka!');
    }
  }

  async findAll(search?: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        deleted_at: null,
        status: RecordStatus.ACTIVE,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      include: {
        purchases: {
          where: { deleted_at: null },
          select: {
            id: true,
            invoice_number: true,
            total_amount: true,
            paid_amount: true,
            payment_status: true,
            created_at: true,
          },
        },
        // Standalone/advance payments (purchase se linked nahi)
        payments: {
          where: { purchase_id: null, deleted_at: null },
          select: { amount: true },
        },
      },
    });

    // NOTE: pehle yeh totalPurchased/totalOutstanding summary calculate hi nahi karta tha —
    // isliye tumhari suppliers list page pe "Total Purchased Rs. 0" show ho raha tha jabke
    // invoices maujood thin. Ab yeh fields response mein hain — list page ko inhi ko
    // read karne ke liye update karna hoga (jaise customer list page karta hai).
    return suppliers.map((supplier) => {
      let totalPurchased = 0;
      let totalOutstanding = 0;

      for (const purchase of supplier.purchases) {
        totalPurchased += Number(purchase.total_amount);
        totalOutstanding += Number(purchase.total_amount) - Number(purchase.paid_amount);
      }

      const advanceCredit = supplier.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      totalOutstanding -= advanceCredit;

      const { payments, ...supplierData } = supplier;

      return {
        ...supplierData,
        totalInvoices: supplier.purchases.length,
        totalPurchased,
        totalOutstanding,
      };
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { created_at: 'desc' },
          include: { payments: { where: { deleted_at: null } } },
        },
      },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier nahi mila!');
    }
    return supplier;
  }

  // Sirf ek jagah se due balance nikalne ka source of truth
  async getDueBalance(supplierId: string): Promise<number> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier nahi mila!');
    return this.calculateDueBalance(supplierId);
  }

  private async calculateDueBalance(supplierId: string, tx?: any): Promise<number> {
    const client = tx || this.prisma;

    const purchases = await client.purchase.findMany({
      where: { supplier_id: supplierId, deleted_at: null },
      select: { total_amount: true, paid_amount: true },
    });

    let outstanding = 0;
    for (const purchase of purchases) {
      outstanding += Number(purchase.total_amount) - Number(purchase.paid_amount);
    }

    const advance = await client.payment.aggregate({
      where: { supplier_id: supplierId, purchase_id: null, deleted_at: null },
      _sum: { amount: true },
    });
    outstanding -= Number(advance._sum.amount || 0);

    return outstanding;
  }

  // Supplier ka poora khata — saari purchases, purchase-payments, AUR standalone/advance
  // payments, sab chronologically running balance ke sath
  async getLedger(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier nahi mila!');

    const purchases = await this.prisma.purchase.findMany({
      where: { supplier_id: id, deleted_at: null },
      orderBy: { created_at: 'asc' },
      include: {
        payments: { where: { deleted_at: null } },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
    });

    const standalonePayments = await this.prisma.payment.findMany({
      where: { supplier_id: id, purchase_id: null, deleted_at: null },
      orderBy: { created_at: 'asc' },
    });

    type LedgerItem = { name: string; quantity: number; unitCost: number; total: number };
    type LedgerEntry = {
      date: Date;
      type: 'PURCHASE' | 'PAYMENT';
      reference: string;
      debit: number;
      credit: number;
      balance: number;
      items?: LedgerItem[];
      paymentMethod?: string;
      paymentId?: string;
    };

    const entries: LedgerEntry[] = [];

    for (const purchase of purchases) {
      entries.push({
        date: purchase.created_at,
        type: 'PURCHASE',
        reference: purchase.invoice_number,
        debit: Number(purchase.total_amount),
        credit: 0,
        balance: 0,
        items: purchase.items.map((item) => ({
          name: item.product?.name || 'Unknown Product',
          quantity: item.quantity,
          unitCost: Number(item.cost_price),
          total: Number(item.cost_price) * item.quantity,
        })),
      });

      for (const payment of purchase.payments) {
        entries.push({
          date: payment.created_at,
          type: 'PAYMENT',
          reference: payment.reference_number || purchase.invoice_number,
          debit: 0,
          credit: Number(payment.amount),
          balance: 0,
          paymentMethod: payment.method,
          paymentId: payment.id,
        });
      }
    }

    for (const payment of standalonePayments) {
      entries.push({
        date: payment.created_at,
        type: 'PAYMENT',
        reference: payment.reference_number || (payment.type === 'SUPPLIER_ADVANCE' ? 'Advance Payment' : 'General Payment'),
        debit: 0,
        credit: Number(payment.amount),
        balance: 0,
        paymentMethod: payment.method,
        paymentId: payment.id,
      });
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    for (const entry of entries) {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    }

    return {
      supplier,
      entries,
      totalOutstanding: runningBalance,
    };
  }

  // Sirf payment history — date, amount, uss waqt ka remaining balance, reference
  async getPaymentHistory(id: string) {
    const { entries, totalOutstanding } = await this.getLedger(id);
    const payments = entries
      .filter((e) => e.type === 'PAYMENT')
      .map((e) => ({
        paymentId: e.paymentId,
        date: e.date,
        amount: e.credit,
        method: e.paymentMethod,
        reference: e.reference,
        remainingBalanceAfter: e.balance,
      }));

    return { payments, currentDueBalance: totalOutstanding };
  }

  // ─── PAY SUPPLIER — bina nayi purchase ke, supplier ke against payment record karo ──
  // Partial payment chalti hai; due se zyada de diya to extra "advance credit" ban jayega.
  async paySupplier(
    supplierId: string,
    dto: { amount: number; method?: string; referenceNumber?: string; notes?: string; userId?: string },
  ) {
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Payment amount 0 se zyada hona chahiye!');
    }

    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier nahi mila!');

    const finalUserId = await this.resolveSalesmanId(dto.userId);
    const method = dto.method || 'CASH';
    const referenceNumber = dto.referenceNumber || `PAY-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      // Oldest unpaid/partial purchase pehle nipatao (FIFO)
      const unpaidPurchases = await tx.purchase.findMany({
        where: {
          supplier_id: supplierId,
          deleted_at: null,
          payment_status: { in: ['PENDING', 'PARTIAL'] },
        },
        orderBy: { created_at: 'asc' },
      });

      let remaining = amount;
      const createdPayments: any[] = [];

      for (const purchase of unpaidPurchases) {
        if (remaining <= 0) break;

        const due = Number(purchase.total_amount) - Number(purchase.paid_amount);
        if (due <= 0) continue;

        const allocation = Math.min(remaining, due);
        const newPaidAmount = Number(purchase.paid_amount) + allocation;

        let newStatus = 'PAID';
        if (newPaidAmount <= 0) newStatus = 'PENDING';
        else if (newPaidAmount < Number(purchase.total_amount)) newStatus = 'PARTIAL';

        await tx.purchase.update({
          where: { id: purchase.id },
          data: { paid_amount: newPaidAmount, payment_status: newStatus },
        });

        const payment = await tx.payment.create({
          data: {
            purchase_id: purchase.id,
            supplier_id: supplierId,
            received_by: finalUserId,
            amount: allocation,
            method,
            type: 'SUPPLIER_PAYMENT',
            reference_number: referenceNumber,
            notes: dto.notes ? `${dto.notes} (against ${purchase.invoice_number})` : `Against ${purchase.invoice_number}`,
          },
        });

        createdPayments.push(payment);
        remaining -= allocation;
      }

      // Sab due chuk gaya, phir bhi paisa bacha — advance/credit ke tor pe rakh lo
      if (remaining > 0) {
        const advancePayment = await tx.payment.create({
          data: {
            supplier_id: supplierId,
            received_by: finalUserId,
            amount: remaining,
            method,
            type: 'SUPPLIER_ADVANCE',
            reference_number: referenceNumber,
            notes: dto.notes ? `${dto.notes} (Advance / extra credit)` : 'Advance / extra credit',
          },
        });
        createdPayments.push(advancePayment);
      }

      const remainingDueBalance = await this.calculateDueBalance(supplierId, tx);

      return {
        message: 'Payment record ho gayi!',
        totalPaid: amount,
        appliedToPurchasesCount: createdPayments.filter((p) => p.purchase_id).length,
        advanceAmount: remaining > 0 ? remaining : 0,
        payments: createdPayments,
        remainingDueBalance,
      };
    });
  }

  // Galti se dali gayi payment reverse karo
  async voidPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.deleted_at) throw new NotFoundException('Payment record nahi mila!');

    return this.prisma.$transaction(async (tx) => {
      if (payment.purchase_id) {
        const purchase = await tx.purchase.findUnique({ where: { id: payment.purchase_id } });
        if (purchase) {
          const newPaidAmount = Math.max(0, Number(purchase.paid_amount) - Number(payment.amount));

          let newStatus = 'PAID';
          if (newPaidAmount <= 0) newStatus = 'PENDING';
          else if (newPaidAmount < Number(purchase.total_amount)) newStatus = 'PARTIAL';

          await tx.purchase.update({
            where: { id: purchase.id },
            data: { paid_amount: newPaidAmount, payment_status: newStatus },
          });
        }
      }

      return tx.payment.update({
        where: { id: paymentId },
        data: { deleted_at: new Date() },
      });
    });
  }

  async update(id: string, data: UpdateSupplierDto) {
    await this.findOne(id);
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          phone: data.phone?.trim(),
          email: data.email?.trim(),
          address: data.address?.trim(),
          company: data.company?.trim(),
        },
      });
    } catch (error) {
      console.error('Supplier Update Error:', error);
      throw new BadRequestException('Supplier update nahi ho saka!');
    }
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true } } },
    });
    if (!supplier) throw new NotFoundException('Supplier nahi mila!');

    if (supplier._count.purchases > 0) {
      return this.prisma.supplier.update({
        where: { id },
        data: { status: RecordStatus.INACTIVE, deleted_at: new Date() },
      });
    }

    try {
      return await this.prisma.supplier.delete({ where: { id } });
    } catch (error) {
      throw new BadRequestException(
        'Yeh supplier pehle kisi purchase mein use ho chuka hai, is liye delete nahi ho sakta!',
      );
    }
  }
}