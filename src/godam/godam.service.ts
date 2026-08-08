// src/godam/godam.service.ts
//
// NOTE: Maine yahan PrismaService "../prisma/prisma.service" se import kiya hai,
// kyunki NestJS + Prisma projects mein aam taur pe yahi path hota hai
// (jaise tumhare customers/expenses modules use kar rahe honge).
// Agar tumhara PrismaService kisi aur path pe hai, to bas ye import line
// badal dena — baaki sab code same rahega.

import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";

const GODAM_TOKEN_SECRET = process.env.GODAM_TOKEN_SECRET || "change-this-secret";
const TOKEN_EXPIRY = "30m";

@Injectable()
export class GodamService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------
  verifyAccess(password: string) {
    if (!password || password !== process.env.GODAM_ACCESS_PASSWORD) {
      throw new UnauthorizedException("Galat password!");
    }
    const token = jwt.sign({ scope: "godam" }, GODAM_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRY });
    return { token, expiresIn: TOKEN_EXPIRY };
  }

  // Guard se pehle isay call karke token verify karte hain
  verifyToken(token: string) {
    if (!token) throw new UnauthorizedException("Godam access token missing. Pehle unlock karein.");
    try {
      jwt.verify(token, GODAM_TOKEN_SECRET);
    } catch {
      throw new UnauthorizedException("Godam session expire ho gaya. Dobara password enter karein.");
    }
  }

  // ---------------------------------------------------------
  async getDashboard() {
    const balances = await this.prisma.godamStockBalance.findMany();
    const totalStockValue = balances.reduce((sum, b) => sum + Number(b.quantity) * Number(b.avgCost), 0);
    const lowStockItems = balances.filter((b) => b.quantity > 0 && b.quantity <= 5).length;
    const outOfStockItems = balances.filter((b) => b.quantity <= 0).length;

    const cashTxns = await this.prisma.godamCashTransaction.findMany();
    const totalCashIn = cashTxns.filter((t) => t.type === "IN").reduce((s, t) => s + Number(t.amount), 0);
    const totalCashOut = cashTxns.filter((t) => t.type === "OUT").reduce((s, t) => s + Number(t.amount), 0);

    return {
      totalStockValue,
      lowStockItems,
      outOfStockItems,
      cashBalance: totalCashIn - totalCashOut,
      totalCashIn,
      totalCashOut,
      netProfitLoss: totalCashIn - totalCashOut,
    };
  }

  // ---------------------------------------------------------
  getStockBalances() {
    return this.prisma.godamStockBalance.findMany({ orderBy: { productName: "asc" } });
  }

  getStockEntries() {
    return this.prisma.godamStockEntry.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }

  async createStockEntry(body: {
    productId: string;
    productName: string;
    type: "IN" | "OUT";
    quantity: number;
    unitCost: number;
    note?: string;
    reason?: string;
  }) {
    const { productId, productName, type, quantity, unitCost, note, reason } = body;

    if (!productId || !productName) throw new BadRequestException("Product select karna zaroori hai");
    if (!["IN", "OUT"].includes(type)) throw new BadRequestException("Type IN ya OUT hona chahiye");
    if (!quantity || quantity <= 0) throw new BadRequestException("Quantity 0 se zyada honi chahiye");

    const qty = Number(quantity);
    const cost = Number(unitCost) || 0;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.godamStockBalance.findUnique({ where: { productId } });

      if (type === "OUT") {
        const availableQty = existing?.quantity || 0;
        if (qty > availableQty) {
          throw new BadRequestException(`Godam mein sirf ${availableQty} units available hain`);
        }
      }

      let newQty: number;
      let newAvgCost: number;
      if (!existing) {
        newQty = type === "IN" ? qty : 0;
        newAvgCost = cost;
      } else if (type === "IN") {
        const totalOldValue = Number(existing.quantity) * Number(existing.avgCost);
        const totalNewValue = qty * cost;
        newQty = existing.quantity + qty;
        newAvgCost = newQty > 0 ? (totalOldValue + totalNewValue) / newQty : 0;
      } else {
        newQty = existing.quantity - qty;
        newAvgCost = Number(existing.avgCost);
      }

      await tx.godamStockBalance.upsert({
        where: { productId },
        update: { quantity: newQty, avgCost: newAvgCost, productName },
        create: { productId, productName, quantity: newQty, avgCost: newAvgCost },
      });

      const entryUnitCost = type === "IN" ? cost : Number(existing?.avgCost || cost);
      const entry = await tx.godamStockEntry.create({
        data: {
          productId,
          productName,
          type,
          quantity: qty,
          unitCost: entryUnitCost,
          totalValue: qty * entryUnitCost,
          note,
          reason,
        },
      });

      await tx.godamActivityLog.create({
        data: {
          action: type === "IN" ? "stock_in" : "stock_out",
          detail: `${productName}: ${qty} units ${type === "IN" ? "aayi" : "nikli"}`,
        },
      });

      return entry;
    });
  }

  // ---------------------------------------------------------
  getCashTransactions() {
    return this.prisma.godamCashTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }

  async createCashTransaction(body: { type: "IN" | "OUT"; amount: number; category: string; note?: string }) {
    const { type, amount, category, note } = body;

    if (!["IN", "OUT"].includes(type)) throw new BadRequestException("Type IN ya OUT hona chahiye");
    if (!amount || amount <= 0) throw new BadRequestException("Amount 0 se zyada hona chahiye");
    if (!category) throw new BadRequestException("Category select karna zaroori hai");

    const txn = await this.prisma.godamCashTransaction.create({
      data: { type, amount: Number(amount), category, note },
    });

    await this.prisma.godamActivityLog.create({
      data: {
        action: type === "IN" ? "cash_in" : "cash_out",
        detail: `Rs. ${amount} ${type === "IN" ? "aaye" : "gaye"} (${category})`,
      },
    });

    return txn;
  }

  // ---------------------------------------------------------
  async getPnlReport(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const txns = await this.prisma.godamCashTransaction.findMany({ where });
    const totalIn = txns.filter((t) => t.type === "IN").reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = txns.filter((t) => t.type === "OUT").reduce((s, t) => s + Number(t.amount), 0);

    const byCategory: Record<string, { in: number; out: number }> = {};
    txns.forEach((t) => {
      byCategory[t.category] = byCategory[t.category] || { in: 0, out: 0 };
      byCategory[t.category][t.type === "IN" ? "in" : "out"] += Number(t.amount);
    });

    return { from: from || null, to: to || null, totalIn, totalOut, netProfitLoss: totalIn - totalOut, byCategory };
  }

  getActivityLog() {
    return this.prisma.godamActivityLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }
}