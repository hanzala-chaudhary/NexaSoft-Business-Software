import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordStatus } from '@prisma/client';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.supplier.findMany({
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
      },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { created_at: 'desc' },
          include: { payments: true },
        },
      },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier nahi mila!');
    }
    return supplier;
  }

  async getLedger(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier nahi mila!');

    const purchases = await this.prisma.purchase.findMany({
      where: { supplier_id: id, deleted_at: null },
      orderBy: { created_at: 'asc' },
      include: { payments: true },
    });

    type LedgerEntry = {
      date: Date;
      type: 'PURCHASE' | 'PAYMENT';
      reference: string;
      debit: number;
      credit: number;
      balance: number;
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
      });

      for (const payment of purchase.payments) {
        entries.push({
          date: payment.created_at,
          type: 'PAYMENT',
          reference: purchase.invoice_number,
          debit: 0,
          credit: Number(payment.amount),
          balance: 0,
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
      supplier,
      entries,
      totalOutstanding: runningBalance,
    };
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