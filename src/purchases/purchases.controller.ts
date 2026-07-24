import { Controller, Post, Body, Get } from '@nestjs/common';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  createPurchase(@Body() body: any) {
    return this.purchasesService.createPurchase(body);
  }

  @Get()
  getAllPurchases() {
    return this.purchasesService.getAllPurchases();
  }
}