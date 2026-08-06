import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RecordStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ─── Sales/Purchases service jaisa hi fallback — agar userId na aaye to
  // seed se bana hua admin use kar lo, error na do (Payment.received_by nullable
  // hai isliye crash nahi hoga, lekin consistent rehne ke liye resolve kar lete hain) ──
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

  async create(dto: CreateCustomerDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Customer ka naam zaroori hai!');
    }

    if (dto.phone && dto.phone.trim()) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone.trim(), deleted_at: null },
      });
      if (existing) {
        throw new BadRequestException('Yeh phone number pehle se kisi customer ke paas registered hai!');
      }
    }

    try {
      return await this.prisma.customer.create({
        data: {
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });
    } catch (error) {
      console.error('Customer Create Error:', error);
      throw new BadRequestException('Customer save nahi ho saka!');
    }
  }

  async findOrCreate(dto: CreateCustomerDto) {
    const trimmedPhone = dto.phone?.trim();

    if (trimmedPhone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: trimmedPhone, deleted_at: null },
      });
      if (existing) return existing;
    }

    return this.create(dto);
  }

  async findAll(search?: string) {
    const customers = await this.prisma.customer.findMany({
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
        sales: {
          where: { deleted_at: null },
          select: {
            id: true,
            invoice_number: true,
            total_amount: true,
            discount: true,
            paid_amount: true,
            payment_status: true,
            created_at: true,
          },
        },
        // Standalone/advance payments (sale se linked nahi) — inhe bhi outstanding mein count karna zaroori hai
        payments: {
          where: { sale_id: null, deleted_at: null },
          select: { amount: true },
        },
      },
    });

    return customers.map((customer) => {
      let totalSpend = 0;
      let totalOutstanding = 0;

      for (const sale of customer.sales) {
        const grandTotal = Number(sale.total_amount) - Number(sale.discount);
        totalSpend += grandTotal;
        totalOutstanding += grandTotal - Number(sale.paid_amount);
      }

      // Advance payments due ko kam kar dete hain (negative balance = customer ka credit)
      const advanceCredit = customer.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      totalOutstanding -= advanceCredit;

      const { payments, ...customerData } = customer;

      return {
        ...customerData,
        totalInvoices: customer.sales.length,
        totalSpend,
        totalOutstanding,
      };
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { created_at: 'desc' },
          include: { payments: { where: { deleted_at: null } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer nahi mila!');
    return customer;
  }

  // Sirf ek jagah se due balance nikalne ka source of truth — Dashboard, Reports,
  // Ledger, sab isi function ko call karein taake kabhi out-of-sync na ho.
  async getDueBalance(customerId: string): Promise<number> {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer nahi mila!');
    return this.calculateDueBalance(customerId);
  }

  private async calculateDueBalance(customerId: string, tx?: any): Promise<number> {
    const client = tx || this.prisma;

    const sales = await client.sale.findMany({
      where: { customer_id: customerId, deleted_at: null },
      select: { total_amount: true, discount: true, paid_amount: true },
    });

    let outstanding = 0;
    for (const sale of sales) {
      outstanding += Number(sale.total_amount) - Number(sale.discount) - Number(sale.paid_amount);
    }

    const advance = await client.payment.aggregate({
      where: { customer_id: customerId, sale_id: null, deleted_at: null },
      _sum: { amount: true },
    });
    outstanding -= Number(advance._sum.amount || 0);

    return outstanding;
  }

  // Customer ka poora khata (ledger) — saari sales (items ke saath), sale-payments,
  // AUR standalone/advance payments, sab chronologically running balance ke sath
  async getLedger(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer nahi mila!');

    const sales = await this.prisma.sale.findMany({
      where: { customer_id: id, deleted_at: null },
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

    // Standalone payments — sale se linked nahi (general "Receive Payment" ya advance credit)
    const standalonePayments = await this.prisma.payment.findMany({
      where: { customer_id: id, sale_id: null, deleted_at: null },
      orderBy: { created_at: 'asc' },
    });

    type LedgerItem = { name: string; quantity: number; unitPrice: number; total: number };
    type LedgerEntry = {
      date: Date;
      type: 'SALE' | 'PAYMENT';
      reference: string;
      debit: number;
      credit: number;
      balance: number;
      items?: LedgerItem[];
      paymentMethod?: string;
      paymentId?: string;
    };

    const entries: LedgerEntry[] = [];

    for (const sale of sales) {
      const grandTotal = Number(sale.total_amount) - Number(sale.discount);
      entries.push({
        date: sale.created_at,
        type: 'SALE',
        reference: sale.invoice_number,
        debit: grandTotal,
        credit: 0,
        balance: 0,
        items: sale.items.map((item) => ({
          name: item.product?.name || 'Unknown Product',
          quantity: item.quantity,
          unitPrice: Number(item.sale_price),
          total: Number(item.sale_price) * item.quantity,
        })),
      });

      for (const payment of sale.payments) {
        entries.push({
          date: payment.created_at,
          type: 'PAYMENT',
          reference: payment.reference_number || sale.invoice_number,
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
        reference: payment.reference_number || (payment.type === 'CUSTOMER_ADVANCE' ? 'Advance Payment' : 'General Payment'),
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
      customer,
      entries,
      totalOutstanding: runningBalance,
    };
  }

  // Sirf payment history chahiye (ledger jaisi cheez, lekin sale-items ke bagair) —
  // date, amount, uss waqt ka remaining balance, aur reference
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

  // ─── RECEIVE PAYMENT — bina naye sale ke, customer ke against payment record karo ──
  // Partial payment bhi chalti hai: agar due Rs. 50,000 hai aur Rs. 25,000 diye,
  // to baqi Rs. 25,000 due reh jayega. Agar due se zyada diye to extra "advance credit"
  // ban jayega jo aage automatically consume ho sakta hai jab naya sale banega.
  async receivePayment(
    customerId: string,
    dto: { amount: number; method?: string; referenceNumber?: string; notes?: string; userId?: string },
  ) {
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Payment amount 0 se zyada hona chahiye!');
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer nahi mila!');

    const finalUserId = await this.resolveSalesmanId(dto.userId);
    const method = dto.method || 'CASH';
    const referenceNumber = dto.referenceNumber || `REC-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      // Oldest unpaid/partial sale pehle nipatao (FIFO)
      const unpaidSales = await tx.sale.findMany({
        where: {
          customer_id: customerId,
          deleted_at: null,
          payment_status: { in: ['PENDING', 'PARTIAL'] },
        },
        orderBy: { created_at: 'asc' },
      });

      let remaining = amount;
      const createdPayments: any[] = [];

      for (const sale of unpaidSales) {
        if (remaining <= 0) break;

        const grandTotal = Number(sale.total_amount) - Number(sale.discount);
        const due = grandTotal - Number(sale.paid_amount);
        if (due <= 0) continue;

        const allocation = Math.min(remaining, due);
        const newPaidAmount = Number(sale.paid_amount) + allocation;

        let newStatus = 'PAID';
        if (newPaidAmount <= 0) newStatus = 'PENDING';
        else if (newPaidAmount < grandTotal) newStatus = 'PARTIAL';

        await tx.sale.update({
          where: { id: sale.id },
          data: { paid_amount: newPaidAmount, payment_status: newStatus },
        });

        const payment = await tx.payment.create({
          data: {
            sale_id: sale.id,
            customer_id: customerId,
            received_by: finalUserId,
            amount: allocation,
            method,
            type: 'CUSTOMER_PAYMENT',
            reference_number: referenceNumber,
            notes: dto.notes ? `${dto.notes} (against ${sale.invoice_number})` : `Against ${sale.invoice_number}`,
          },
        });

        createdPayments.push(payment);
        remaining -= allocation;
      }

      // Sab due chuk gaya, phir bhi paisa bacha — advance/credit ke tor pe rakh lo
      if (remaining > 0) {
        const advancePayment = await tx.payment.create({
          data: {
            customer_id: customerId,
            received_by: finalUserId,
            amount: remaining,
            method,
            type: 'CUSTOMER_ADVANCE',
            reference_number: referenceNumber,
            notes: dto.notes ? `${dto.notes} (Advance / extra credit)` : 'Advance / extra credit',
          },
        });
        createdPayments.push(advancePayment);
      }

      const remainingDueBalance = await this.calculateDueBalance(customerId, tx);

      return {
        message: 'Payment record ho gayi!',
        totalReceived: amount,
        appliedToSalesCount: createdPayments.filter((p) => p.sale_id).length,
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
      if (payment.sale_id) {
        const sale = await tx.sale.findUnique({ where: { id: payment.sale_id } });
        if (sale) {
          const grandTotal = Number(sale.total_amount) - Number(sale.discount);
          const newPaidAmount = Math.max(0, Number(sale.paid_amount) - Number(payment.amount));

          let newStatus = 'PAID';
          if (newPaidAmount <= 0) newStatus = 'PENDING';
          else if (newPaidAmount < grandTotal) newStatus = 'PARTIAL';

          await tx.sale.update({
            where: { id: sale.id },
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

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(id);

    if (dto.phone && dto.phone.trim() && dto.phone.trim() !== customer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone.trim(), deleted_at: null },
      });
      if (existing) {
        throw new BadRequestException('Yeh phone number pehle se kisi aur customer ke paas registered hai!');
      }
    }

    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });
    } catch (error) {
      throw new BadRequestException('Customer update nahi ho saka!');
    }
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { sales: true } } },
    });

    if (!customer) throw new NotFoundException('Customer nahi mila!');

    if (customer._count.sales > 0) {
      return this.prisma.customer.update({
        where: { id },
        data: { status: RecordStatus.INACTIVE, deleted_at: new Date() },
      });
    }

    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (error) {
      throw new BadRequestException('Customer delete nahi ho saka!');
    }
  }
}