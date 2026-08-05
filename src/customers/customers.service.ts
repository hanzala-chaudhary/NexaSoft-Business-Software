import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

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
      },
    });

    // Har customer ke liye summary bhi nikal do: total invoices, total spend, total baqaya
    return customers.map((customer) => {
      let totalSpend = 0;
      let totalOutstanding = 0;

      for (const sale of customer.sales) {
        const grandTotal = Number(sale.total_amount) - Number(sale.discount);
        totalSpend += grandTotal;
        totalOutstanding += grandTotal - Number(sale.paid_amount);
      }

      return {
        ...customer,
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
          include: { payments: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer nahi mila!');
    return customer;
  }

  // Customer ka poora khata (ledger) — saari sales (items ke saath) aur payments, running balance ke sath
  async getLedger(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer nahi mila!');

    const sales = await this.prisma.sale.findMany({
      where: { customer_id: id, deleted_at: null },
      orderBy: { created_at: 'asc' },
      include: {
        payments: true,
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
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
          reference: sale.invoice_number,
          debit: 0,
          credit: Number(payment.amount),
          balance: 0,
          paymentMethod: payment.method,
        });
      }
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