import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    // Aaj ki date set karein taake sirf aaj ka data aaye
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Today's Total Sales (Aaj ki total bikri)
    const todaySales = await this.prisma.sale.aggregate({
      where: { created_at: { gte: today } },
      _sum: { total_amount: true },
    });
    const totalSales = Number(todaySales._sum.total_amount) || 0;

    // 2. Today's Profit (Sale Price - Purchase Price)
    const todaySaleItems = await this.prisma.saleItem.findMany({
      where: { created_at: { gte: today } },
      include: { product: true },
    });

    let totalProfit = 0;
    todaySaleItems.forEach(item => {
      const costPrice = Number(item.product.purchasePrice || 0);
      const salePrice = Number(item.sale_price || 0);
      const qty = Number(item.quantity || 0);
      totalProfit += (salePrice - costPrice) * qty;
    });

    // 3. Low Stock Items (Jin ka stock 5 ya us se kam reh gaya hai)
    const lowStockProducts = await this.prisma.product.findMany({
      where: { opening_stock: { lte: 5 } },
      select: { id: true, name: true, opening_stock: true },
      take: 5,
    });

    // 4. Recent Sales (Aakhri 5 invoices)
    const recentSales = await this.prisma.sale.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { customer: true },
    });

    return {
      totalSales,
      totalProfit,
      lowStockProducts,
      recentSales,
    };
  }
}