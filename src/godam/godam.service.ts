import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service'; 

const GODAM_TOKEN_SECRET = process.env.GODAM_TOKEN_SECRET || 'NexaSoft-Enterprise-Godam-Key-2026';
const TOKEN_EXPIRY = '4h'; 

@Injectable()
export class GodamService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // SECURITY & ACCESS MANAGEMENT
  // ==========================================
  verifyAccess(password: string) {
    const validPassword = process.env.GODAM_ACCESS_PASSWORD || 'Tayyab001122';
    
    if (password !== validPassword) {
      throw new UnauthorizedException('Invalid security clearance. Incident logged.');
    }

    const payload = {
      scope: 'godam_admin',
      authorizedAt: new Date().toISOString(),
      clearanceLevel: 'HIGH'
    };

    const token = jwt.sign(payload, GODAM_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRY });
    return { token, expiresIn: TOKEN_EXPIRY, message: 'Secure connection established.' };
  }

  verifyToken(token: string) {
    if (!token) throw new UnauthorizedException('Missing authorization token. Access restricted.');
    try {
      return jwt.verify(token, GODAM_TOKEN_SECRET);
    } catch (error) {
      throw new UnauthorizedException('Session expired or tampered. Re-authenticate immediately.');
    }
  }

  // ==========================================
  // ENTERPRISE DASHBOARD METRICS
  // ==========================================
  async getDashboardMetrics() {
    try {
      const balances = await (this.prisma as any).godamStockBalance.findMany();
      let totalStockValue = 0, lowStockItems = 0, outOfStockItems = 0, healthyItems = 0;

      balances.forEach(b => {
        const value = Number(b.quantity) * Number(b.avgCost);
        totalStockValue += value;
        if (b.quantity <= 0) outOfStockItems++;
        else if (b.quantity <= 5) lowStockItems++;
        else healthyItems++;
      });

      const cashTxns = await (this.prisma as any).godamCashTransaction.findMany();
      let totalCashIn = 0, totalCashOut = 0;

      cashTxns.forEach(t => {
        if (t.type === 'IN') totalCashIn += Number(t.amount);
        if (t.type === 'OUT') totalCashOut += Number(t.amount);
      });

      return {
        totalStockValue,
        inventoryHealth: { critical: outOfStockItems, warning: lowStockItems, optimal: healthyItems },
        cashBalance: totalCashIn - totalCashOut,
        totalCashIn, totalCashOut,
        netProfitLoss: totalCashIn - totalCashOut,
        lastComputed: new Date()
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to compute Godam metrics.');
    }
  }

  // ==========================================
  // INVENTORY VALUATION & WEIGHTED AVERAGE
  // ==========================================
  async getAllStockBalances() {
    return await (this.prisma as any).godamStockBalance.findMany({ orderBy: { productName: 'asc' } });
  }

  async getRecentStockEntries() {
    return await (this.prisma as any).godamStockEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 250 });
  }

  // 🔍 NEW: Get Active Serials for Modal
  async getProductActiveSerials(productId: string) {
    return await (this.prisma as any).godamHardwareSerial.findMany({
      where: { productId, status: 'IN_GODAM' },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 🎯 NEW: Track specific serial number
  async trackSerialNumber(serialNumber: string) {
    const asset = await (this.prisma as any).godamHardwareSerial.findUnique({
      where: { serialNumber }
    });
    if (!asset) {
      throw new NotFoundException(`Serial number '${serialNumber}' does not exist in Godam records.`);
    }
    return asset;
  }

  // 🔥 CORE ENTERPRISE INVENTORY ENGINE
  async processStockEntry(body: any, decodedToken: any) {
    const { productName, type, quantity, unitCost, note, reason, brand, hardwareType, capacity, serials } = body;
    const operator = decodedToken?.scope || 'System Admin';

    if (!productName || productName.trim() === '') throw new BadRequestException('Product Name is mandatory.');
    if (!['IN', 'OUT', 'TRANSFER'].includes(type)) throw new BadRequestException('Invalid operation type.');
    if (!quantity || Number(quantity) <= 0) throw new BadRequestException('Transaction volume must be greater than zero.');

    const qty = Number(quantity);
    const incomingCost = Number(unitCost) || 0;
    const cleanProductName = productName.trim();

    if (serials && Array.isArray(serials) && serials.length > 0 && serials.length !== qty) {
      throw new BadRequestException(`Mismatch! Quantity is ${qty} but you provided ${serials.length} serials.`);
    }

    return this.prisma.$transaction(async (tx) => {
      let existing = await (tx as any).godamStockBalance.findFirst({ 
        where: { productName: { equals: cleanProductName, mode: 'insensitive' } } 
      });

      if (['OUT', 'TRANSFER'].includes(type)) {
        if (!existing || qty > existing.quantity) {
          throw new BadRequestException(`Insufficient stock for "${cleanProductName}". Requested: ${qty}, Available: ${existing?.quantity || 0}`);
        }
      }

      let newQty = 0, newAvgCost = 0, operationValue = 0;
      let finalProductId = existing?.productId || `GDM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 🧮 ACCOUNTING ENGINE: Weighted Average Cost Method
      if (!existing) {
        newQty = type === 'IN' ? qty : 0;
        newAvgCost = incomingCost;
        operationValue = qty * incomingCost;
      } else if (type === 'IN') {
        const totalOldValue = Number(existing.quantity) * Number(existing.avgCost);
        const totalNewValue = qty * incomingCost;
        newQty = existing.quantity + qty;
        newAvgCost = newQty > 0 ? (totalOldValue + totalNewValue) / newQty : 0;
        operationValue = totalNewValue;
      } else {
        // For OUT/TRANSFER: Average cost does NOT change. Only total stock value decreases.
        newQty = existing.quantity - qty;
        newAvgCost = Number(existing.avgCost); 
        operationValue = qty * newAvgCost;
      }

      // 1. Update Asset Ledger (Now includes Brand, Type, Capacity)
      await (tx as any).godamStockBalance.upsert({
        where: { productId: finalProductId },
        update: { quantity: newQty, avgCost: newAvgCost, productName: cleanProductName, brand, hardwareType, capacity },
        create: { productId: finalProductId, productName: cleanProductName, quantity: newQty, avgCost: newAvgCost, brand, hardwareType, capacity },
      });

      // 2. 🔥 HARDWARE SERIAL TRACKING (Fixed Loophole)
      if (serials && serials.length > 0) {
        if (type === 'IN') {
          // Check for duplicate serials globally first
          const existingSerials = await (tx as any).godamHardwareSerial.findMany({
            where: { serialNumber: { in: serials } }
          });
          if (existingSerials.length > 0) {
             const dupes = existingSerials.map(s => s.serialNumber).join(', ');
             throw new BadRequestException(`Duplicate Serials detected across system: ${dupes}`);
          }

          const serialData = serials.map(sn => ({
            serialNumber: sn,
            productId: finalProductId,
            productName: cleanProductName,
            status: 'IN_GODAM',
            purchaseCost: incomingCost,
            createdBy: operator
          }));
          await (tx as any).godamHardwareSerial.createMany({ data: serialData });
        } else {
          // Out or Transfer - Validate and Update Status
          const availableSerials = await (tx as any).godamHardwareSerial.findMany({
            where: { serialNumber: { in: serials }, status: 'IN_GODAM' }
          });
          if (availableSerials.length !== serials.length) {
            throw new BadRequestException("Scan Error: One or more scanned serials are NOT currently available in Godam!");
          }
          const targetStatus = type === 'TRANSFER' ? 'TRANSFERRED_TO_SHOP' : 'SOLD_FROM_GODAM';
          await (tx as any).godamHardwareSerial.updateMany({
            where: { serialNumber: { in: serials } },
            data: { status: targetStatus, updatedAt: new Date() }
          });
        }
      }

      const finalApiType = type === 'TRANSFER' ? 'OUT' : type;
      const finalReason = type === 'TRANSFER' ? 'TRANSFER_TO_SHOP' : reason;

      // 3. Record Stock Movement
      const entry = await (tx as any).godamStockEntry.create({
        data: {
          productId: finalProductId, productName: cleanProductName, type: finalApiType, quantity: qty,
          unitCost: type === 'IN' ? incomingCost : newAvgCost, totalValue: operationValue,
          note: note || (type === 'TRANSFER' ? 'Asset dispatched to retail floor' : null),
          reason: finalReason, createdBy: operator
        },
      });

      // 4. System Security Audit Log
      await this.logActivity(
        type === 'IN' ? 'STOCK_INWARD' : type === 'TRANSFER' ? 'STOCK_DISPATCH' : 'STOCK_OUTWARD',
        `${qty}x ${cleanProductName} processed. Valuation Impact: Rs.${operationValue.toFixed(2)}. ${serials?.length ? `[Tracked ${serials.length} Serials]` : ''}`,
        operator, tx
      );

      return entry;
    }, { maxWait: 15000, timeout: 30000 }); 
  }

  // ==========================================
  // FINANCIAL CASH-FLOW MANAGER
  // ==========================================
  async getCashTransactions() {
    return await (this.prisma as any).godamCashTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
  }

  async processCashTransaction(body: any, decodedToken: any) {
    const { type, amount, category, note } = body;
    const operator = decodedToken?.scope || 'System Admin';

    if (!['IN', 'OUT'].includes(type)) throw new BadRequestException('Transaction direction must be IN or OUT.');
    if (!amount || Number(amount) <= 0) throw new BadRequestException('Transaction value must be positive.');
    if (!category) throw new BadRequestException('Cost center / category is required.');

    return this.prisma.$transaction(async (tx) => {
      const txn = await (tx as any).godamCashTransaction.create({
        data: { type, amount: Number(amount), category, note, createdBy: operator },
      });

      await this.logActivity(
        `FUNDS_${type}`,
        `Rs. ${Number(amount).toLocaleString()} cleared via ${category.toUpperCase()}. ${note ? `Ref: ${note}` : ''}`,
        operator, tx
      );

      return txn;
    });
  }

  // ==========================================
  // PROFITABILITY ANALYTICS (P&L)
  // ==========================================
  async generatePnLReport(from?: string, to?: string) {
    const whereClause: any = {};
    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt.gte = new Date(from);
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDate;
      }
    }

    const txns = await (this.prisma as any).godamCashTransaction.findMany({ where: whereClause });
    let totalIn = 0, totalOut = 0;
    const byCategory: Record<string, { in: number; out: number; net: number }> = {};

    txns.forEach((t) => {
      const amt = Number(t.amount);
      if (!byCategory[t.category]) byCategory[t.category] = { in: 0, out: 0, net: 0 };
      if (t.type === 'IN') {
        totalIn += amt; byCategory[t.category].in += amt;
      } else {
        totalOut += amt; byCategory[t.category].out += amt;
      }
      byCategory[t.category].net = byCategory[t.category].in - byCategory[t.category].out;
    });

    return { 
      period: { from: from || 'Inception', to: to || 'Current' }, 
      totalIn, totalOut, netProfitLoss: totalIn - totalOut,
      marginPercentage: totalIn > 0 ? (((totalIn - totalOut) / totalIn) * 100).toFixed(2) : 0, 
      byCategory 
    };
  }

  // ==========================================
  // AUDIT & COMPLIANCE LOGGER
  // ==========================================
  async getAuditLogs() {
    return await (this.prisma as any).godamActivityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  }

  private async logActivity(action: string, detail: string, createdBy: string, tx: any) {
    await tx.godamActivityLog.create({ data: { action, detail, createdBy } });
  }
}