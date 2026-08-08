import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Path check kar lijiyega

@Injectable()
export class GodamService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // DASHBOARD ADVANCED METRICS
  // ==========================================
  async getDashboardMetrics() {
    const balances = await (this.prisma as any).godamStockBalance.findMany();
    let totalStockValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    balances.forEach(b => {
      totalStockValue += (Number(b.quantity) * Number(b.avgCost));
      if (b.quantity <= 0) outOfStockItems++;
      else if (b.quantity <= 5) lowStockItems++;
    });

    const cashTxns = await (this.prisma as any).godamCashTransaction.findMany();
    let totalIn = 0;
    let totalOut = 0;

    cashTxns.forEach(t => {
      if (t.type === 'IN') totalIn += Number(t.amount);
      if (t.type === 'OUT') totalOut += Number(t.amount);
    });

    return {
      totalStockValue,
      cashBalance: totalIn - totalOut,
      netProfitLoss: totalIn - totalOut, // VIP simplified P&L logic
      lowStockItems,
      outOfStockItems
    };
  }

  // ==========================================
  // STOCK MANAGEMENT & WEIGHTED AVERAGE
  // ==========================================
  async getAllStockBalances() {
    return await (this.prisma as any).godamStockBalance.findMany({
      orderBy: { productName: 'asc' }
    });
  }

  async getRecentStockEntries() {
    return await (this.prisma as any).godamStockEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async processStockEntry(data: any) {
    const { productId, productName, type, quantity, unitCost, reason, note } = data;

    return await this.prisma.$transaction(async (prisma) => {
      let balance = await (prisma as any).godamStockBalance.findUnique({ where: { productId } });
      let newAvgCost = 0;

      if (type === 'IN') {
        if (balance) {
          // Weighted Average Cost Formula
          const oldTotalValue = Number(balance.quantity) * Number(balance.avgCost);
          const newTotalValue = quantity * unitCost;
          const newTotalQty = balance.quantity + quantity;
          newAvgCost = (oldTotalValue + newTotalValue) / newTotalQty;

          await (prisma as any).godamStockBalance.update({
            where: { productId },
            data: { quantity: { increment: quantity }, avgCost: newAvgCost }
          });
        } else {
          newAvgCost = unitCost;
          await (prisma as any).godamStockBalance.create({
            data: { productId, productName, quantity, avgCost: unitCost }
          });
        }
      } else if (type === 'OUT') {
        if (!balance || balance.quantity < quantity) {
          throw new BadRequestException(`Godam mein ${productName} ka itna stock nahi hai! (Available: ${balance?.quantity || 0})`);
        }
        newAvgCost = Number(balance.avgCost);
        await (prisma as any).godamStockBalance.update({
          where: { productId },
          data: { quantity: { decrement: quantity } }
        });
      }

      // Record Entry
      const entry = await (prisma as any).godamStockEntry.create({
        data: {
          productId, productName, type, quantity,
          unitCost: type === 'IN' ? unitCost : newAvgCost,
          totalValue: quantity * (type === 'IN' ? unitCost : newAvgCost),
          reason, note, createdBy: 'Admin'
        }
      });

      // Audit Log
      await this.logActivity(`STOCK_${type}`, `${quantity}x ${productName} godam se ${type === 'IN' ? 'add' : 'nikaal'} kiya gaya.`, 'Admin', prisma);

      return entry;
    });
  }

  // ==========================================
  // CASH LEDGER MANAGEMENT
  // ==========================================
  async getCashTransactions() {
    return await (this.prisma as any).godamCashTransaction.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async processCashTransaction(data: any) {
    return await this.prisma.$transaction(async (prisma) => {
      const txn = await (prisma as any).godamCashTransaction.create({
        data: {
          type: data.type,
          amount: Number(data.amount),
          category: data.category,
          note: data.note,
          createdBy: 'Admin'
        }
      });

      await this.logActivity(`CASH_${data.type}`, `Rs. ${data.amount} godam khate mein ${data.type} hue. Category: ${data.category}`, 'Admin', prisma);
      return txn;
    });
  }

  // ==========================================
  // PROFIT & LOSS (P&L) REPORTS
  // ==========================================
  async generatePnLReport(fromDate?: string, toDate?: string) {
    let dateFilter = {};
    if (fromDate || toDate) {
      dateFilter = { createdAt: {} };
      if (fromDate) (dateFilter as any).createdAt.gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        (dateFilter as any).createdAt.lte = to;
      }
    }

    const txns = await (this.prisma as any).godamCashTransaction.findMany({ where: dateFilter });
    let totalIn = 0;
    let totalOut = 0;
    const byCategory: any = {};

    txns.forEach(t => {
      const amt = Number(t.amount);
      if (!byCategory[t.category]) byCategory[t.category] = { in: 0, out: 0 };
      
      if (t.type === 'IN') {
        totalIn += amt;
        byCategory[t.category].in += amt;
      } else {
        totalOut += amt;
        byCategory[t.category].out += amt;
      }
    });

    return {
      totalIn,
      totalOut,
      netProfitLoss: totalIn - totalOut,
      byCategory
    };
  }

  // ==========================================
  // SECURITY AUDIT LOGS
  // ==========================================
  async getAuditLogs() {
    return await (this.prisma as any).godamActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 // Sirf latest 100 logs
    });
  }

  private async logActivity(action: string, detail: string, createdBy: string, prismaInstance: any) {
    await prismaInstance.godamActivityLog.create({
      data: { action, detail, createdBy }
    });
  }
}