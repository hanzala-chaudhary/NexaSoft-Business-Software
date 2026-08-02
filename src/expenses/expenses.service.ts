import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async createExpense(data: any) {
    if (!data.title || !data.amount) {
      throw new BadRequestException("Kharchay ka Title aur Amount zaroori hai!");
    }

    return await this.prisma.expense.create({
      data: {
        title: data.title.trim(),
        amount: Number(data.amount),
        category: data.category || 'General',
        description: data.description?.trim() || null,
      }
    });
  }

  async getAllExpenses() {
    return await this.prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
  }

  async deleteExpense(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException("Expense record nahi mila!");

    return await this.prisma.expense.delete({ where: { id } });
  }
}