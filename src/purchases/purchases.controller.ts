import { Controller, Post, Body, Get } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  createPurchase(@Body() body: CreatePurchaseDto) {
    return this.purchasesService.createPurchase(body);
  }

  @Get()
  getAllPurchases() {
    return this.purchasesService.getAllPurchases();
  }
}