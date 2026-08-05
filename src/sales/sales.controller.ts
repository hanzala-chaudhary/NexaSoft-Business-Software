import { Controller, Get, Post, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(@Body() body: any, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || body.userId;
      // Yahan se Auth error block hata diya gaya hai
      // if (!userId) {
      //   throw new HttpException('User authenticate nahi hua!', HttpStatus.UNAUTHORIZED);
      // }
      return await this.salesService.createSale({ ...body, userId });
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Sale create karne mein masla pesh aaya.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/return')
  async returnSale(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || body.userId;
      // Yahan se Auth error block hata diya gaya hai
      // if (!userId) {
      //   throw new HttpException('User authenticate nahi hua!', HttpStatus.UNAUTHORIZED);
      // }
      return await this.salesService.processReturn(id, { ...body, userId });
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Return process karne mein masla pesh aaya.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getAllSales() {
    return await this.salesService.getAllSales();
  }

  @Get(':id')
  async getSaleById(@Param('id') id: string) {
    return await this.salesService.getSaleById(id);
  }
}