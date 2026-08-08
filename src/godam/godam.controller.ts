import { Controller, Get, Post, Body, Req, Query, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { GodamService } from './godam.service';
import type { Request } from 'express';

@Controller('godam')
export class GodamController {
  constructor(private readonly godamService: GodamService) {}

  // 🔒 GODAM PASSWORD LOCK
  @Post('verify-access')
  verifyAccess(@Body() body: { password: string }) {
    // 👇 Yahan aap apni marzi ka password set kar sakte hain
    const GODAM_SECRET_PASSWORD = 'Tayyab123!'; 

    if (body.password === GODAM_SECRET_PASSWORD) {
      return { token: 'godam-vip-secure-token-786', message: 'Access Granted' };
    }
    throw new UnauthorizedException('Galat Password! Access Denied.');
  }

  // 🛡️ SECURITY CHECK FOR ALL ROUTES
  private checkAccess(req: Request) {
    const token = req.headers['x-godam-token'];
    if (token !== 'godam-vip-secure-token-786') {
      throw new UnauthorizedException('Godam session expired ya unauthorized.');
    }
  }

  // 📊 DASHBOARD METRICS
  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    this.checkAccess(req);
    return await this.godamService.getDashboardMetrics();
  }

  // 📦 STOCK ROUTES
  @Get('stock')
  async getStockBalances(@Req() req: Request) {
    this.checkAccess(req);
    return await this.godamService.getAllStockBalances();
  }

  @Post('stock')
  async processStock(@Req() req: Request, @Body() body: any) {
    this.checkAccess(req);
    return await this.godamService.processStockEntry(body);
  }

  @Get('stock/entries')
  async getStockEntries(@Req() req: Request) {
    this.checkAccess(req);
    return await this.godamService.getRecentStockEntries();
  }

  // 💰 CASH ROUTES
  @Get('cash')
  async getCashLedger(@Req() req: Request) {
    this.checkAccess(req);
    return await this.godamService.getCashTransactions();
  }

  @Post('cash')
  async processCash(@Req() req: Request, @Body() body: any) {
    this.checkAccess(req);
    return await this.godamService.processCashTransaction(body);
  }

  // 📈 P&L REPORTS
  @Get('reports/pnl')
  async getPnLReport(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    this.checkAccess(req);
    return await this.godamService.generatePnLReport(from, to);
  }

  // 🕵️ AUDIT LOGS (Security Feature)
  @Get('activity')
  async getAuditLogs(@Req() req: Request) {
    this.checkAccess(req);
    return await this.godamService.getAuditLogs();
  }
}