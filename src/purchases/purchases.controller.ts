import { Controller, Post, Body, Get, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async createPurchase(@Body() body: CreatePurchaseDto, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || (body as any).userId;
      // Yahan se Auth error block hata diya gaya hai
      // if (!userId) {
      //   throw new HttpException('User authenticate nahi hua!', HttpStatus.UNAUTHORIZED);
      // }
      return await this.purchasesService.createPurchase({ ...body, userId });
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Purchase create karne mein masla pesh aaya.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  getAllPurchases() {
    return this.purchasesService.getAllPurchases();
  }

  @Get(':id')
  getPurchaseById(@Param('id') id: string) {
    return this.purchasesService.getPurchaseById(id);
  }
}