import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getPeriodBounds() {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const thisMonthEnd = todayEnd;

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    // Pichle mahine ka aakhri din — is mahine ke pehle din se ek din pehle
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return {
      todayStart,
      todayEnd,
      yesterdayStart,
      yesterdayEnd,
      thisMonthStart,
      thisMonthEnd,
      lastMonthStart,
      lastMonthEnd,
    };
  }

  // Ek time-range ke liye Sales, Profit, aur Invoice count nikalta hai
  private async getPeriodStats(start: Date, end: Date) {
    const [salesAgg, saleItems] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { created_at: { gte: start, lte: end } },
        _sum: { total_amount: true },
        _count: true,
      }),
      this.prisma.saleItem.findMany({
        where: { created_at: { gte: start, lte: end } },
        include: { product: { select: { purchasePrice: true } } },
      }),
    ]);

    let totalProfit = 0;
    saleItems.forEach((item) => {
      const costPrice = Number(item.product.purchasePrice || 0);
      const salePrice = Number(item.sale_price || 0);
      const qty = Number(item.quantity || 0);
      totalProfit += (salePrice - costPrice) * qty;
    });

    return {
      totalSales: Number(salesAgg._sum.total_amount) || 0,
      totalProfit,
      invoiceCount: typeof salesAgg._count === 'number' ? salesAgg._count : 0,
    };
  }

  async getSummary() {
    const bounds = this.getPeriodBounds();

    // Sab periods aur baaki data ek sath (parallel) fetch hota hai — speed ke liye
    const [today, yesterday, thisMonth, lastMonth, lowStockProducts, recentSales] = await Promise.all([
      this.getPeriodStats(bounds.todayStart, bounds.todayEnd),
      this.getPeriodStats(bounds.yesterdayStart, bounds.yesterdayEnd),
      this.getPeriodStats(bounds.thisMonthStart, bounds.thisMonthEnd),
      this.getPeriodStats(bounds.lastMonthStart, bounds.lastMonthEnd),
      this.prisma.product.findMany({
        where: { opening_stock: { lte: 5 }, deleted_at: null },
        select: { id: true, name: true, opening_stock: true },
        take: 5,
      }),
      this.prisma.sale.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { customer: true },
      }),
    ]);

    return { today, yesterday, thisMonth, lastMonth, lowStockProducts, recentSales };
  }
}