import { Controller, Get, Post, Body, Req, Query, UnauthorizedException, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { GodamService } from './godam.service';

@Controller('godam')
export class GodamController {
  constructor(private readonly godamService: GodamService) {}

  // 🔐 Advanced Authentication Gateway
  @Post('verify-access')
  async verifyAccess(@Body('password') password: string) {
    if (!password) {
      throw new HttpException('Security key is required for access.', HttpStatus.BAD_REQUEST);
    }
    return await this.godamService.verifyAccess(password);
  }

  // 📊 Executive Dashboard Analytics
  @Get('dashboard')
  async getDashboard(@Headers('x-godam-token') token: string) {
    this.godamService.verifyToken(token);
    return await this.godamService.getDashboardMetrics();
  }

  // 📦 Inventory & Valuation Endpoints
  @Get('stock')
  async getStockBalances(@Headers('x-godam-token') token: string) {
    this.godamService.verifyToken(token);
    return await this.godamService.getAllStockBalances();
  }

  @Get('stock/entries')
  async getStockEntries(@Headers('x-godam-token') token: string) {
    this.godamService.verifyToken(token);
    return await this.godamService.getRecentStockEntries();
  }

  @Post('stock')
  async processStockEntry(@Headers('x-godam-token') token: string, @Body() body: any) {
    const decodedToken = this.godamService.verifyToken(token);
    return await this.godamService.processStockEntry(body, decodedToken);
  }

  // 💰 Financial Ledger Endpoints
  @Get('cash')
  async getCashLedger(@Headers('x-godam-token') token: string) {
    this.godamService.verifyToken(token);
    return await this.godamService.getCashTransactions();
  }

  @Post('cash')
  async processCashTransaction(@Headers('x-godam-token') token: string, @Body() body: any) {
    const decodedToken = this.godamService.verifyToken(token);
    return await this.godamService.processCashTransaction(body, decodedToken);
  }

  // 📈 Advanced Analytics & Reporting
  @Get('reports/pnl')
  async getPnlReport(
    @Headers('x-godam-token') token: string, 
    @Query('from') from?: string, 
    @Query('to') to?: string
  ) {
    this.godamService.verifyToken(token);
    return await this.godamService.generatePnLReport(from, to);
  }

  // 🕵️ System Audit & Security Logs
  @Get('activity')
  async getActivityLogs(@Headers('x-godam-token') token: string) {
    this.godamService.verifyToken(token);
    return await this.godamService.getAuditLogs();
  }
}