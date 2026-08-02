import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  // 1. Current Open Shift check karna
  async getCurrentShift() {
    return await this.prisma.shift.findFirst({
      where: { status: 'OPEN' },
    });
  }

  // 2. Nayi Shift Open karna
  async openShift(data: { opening_cash: number; opened_by?: string }) {
    const existingShift = await this.getCurrentShift();
    if (existingShift) {
      throw new BadRequestException("Pehle purani shift close karein!");
    }

    return await this.prisma.shift.create({
      data: {
        opening_cash: Number(data.opening_cash),
        opened_by: data.opened_by || 'Admin',
      },
    });
  }

  // 3. Shift Close karna (Saara hisaab kitab yahan hoga)
  async closeShift(data: { closing_cash: number; notes?: string }) {
    const currentShift = await this.getCurrentShift();
    if (!currentShift) {
      throw new BadRequestException("Koi open shift nahi mili!");
    }

    const now = new Date();

    // 1. Is shift ke doran hone wali Sales nikalna
    const sales = await this.prisma.sale.findMany({
      where: {
        created_at: { gte: currentShift.opening_time, lte: now },
      },
    });

    // 2. Is shift ke doran hone walay Expenses nikalna
    const expenses = await this.prisma.expense.findMany({
      where: {
        created_at: { gte: currentShift.opening_time, lte: now },
      },
    });

    // Math: Expected Cash = Opening Cash + Sales - Expenses
    let totalSales = 0;
    sales.forEach(s => {
      // Agar sale Refund ho chuki hai toh uske paise gally mein nahi honge
      if (s.payment_status !== 'REFUNDED') {
        totalSales += Number(s.total_amount);
      }
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const expectedCash = Number(currentShift.opening_cash) + totalSales - totalExpenses;

    // Shift Update and Close
    return await this.prisma.shift.update({
      where: { id: currentShift.id },
      data: {
        closing_time: now,
        closing_cash: Number(data.closing_cash),
        expected_cash: expectedCash,
        status: 'CLOSED',
        notes: data.notes || null,
      },
    });
  }

  // 4. Shift History (Purani shifts dekhne ke liye)
  async getShiftHistory() {
    return await this.prisma.shift.findMany({
      orderBy: { opening_time: 'desc' },
    });
  }
}