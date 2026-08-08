// src/godam/godam.controller.ts

import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { GodamService } from "./godam.service";

@Controller("godam")
export class GodamController {
  constructor(private readonly godamService: GodamService) {}

  @Post("verify-access")
  verifyAccess(@Body("password") password: string) {
    return this.godamService.verifyAccess(password);
  }

  @Get("dashboard")
  getDashboard(@Headers("x-godam-token") token: string) {
    this.godamService.verifyToken(token);
    return this.godamService.getDashboard();
  }

  @Get("stock")
  getStock(@Headers("x-godam-token") token: string) {
    this.godamService.verifyToken(token);
    return this.godamService.getStockBalances();
  }

  @Get("stock/entries")
  getStockEntries(@Headers("x-godam-token") token: string) {
    this.godamService.verifyToken(token);
    return this.godamService.getStockEntries();
  }

  @Post("stock")
  createStockEntry(@Headers("x-godam-token") token: string, @Body() body: any) {
    this.godamService.verifyToken(token);
    return this.godamService.createStockEntry(body);
  }

  @Get("cash")
  getCash(@Headers("x-godam-token") token: string) {
    this.godamService.verifyToken(token);
    return this.godamService.getCashTransactions();
  }

  @Post("cash")
  createCash(@Headers("x-godam-token") token: string, @Body() body: any) {
    this.godamService.verifyToken(token);
    return this.godamService.createCashTransaction(body);
  }

  @Get("reports/pnl")
  getPnl(@Headers("x-godam-token") token: string, @Query("from") from?: string, @Query("to") to?: string) {
    this.godamService.verifyToken(token);
    return this.godamService.getPnlReport(from, to);
  }

  @Get("activity")
  getActivity(@Headers("x-godam-token") token: string) {
    this.godamService.verifyToken(token);
    return this.godamService.getActivityLog();
  }
}