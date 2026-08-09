import { Controller, Get, Post, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // 🛒 Process Enterprise POS Checkout
  @Post()
  async createSale(@Body() body: any, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || body.userId;
      return await this.salesService.createSale({ ...body, userId });
    } catch (error: any) {
      console.error("Sale Error:", error);
      throw new HttpException(
        error.message || 'Checkout failed during database transaction.',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 🔄 Process Sales Return (RMA)
  @Post(':id/return')
  async returnSale(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || body.userId;
      return await this.salesService.processReturn(id, { ...body, userId });
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Return process failed.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 📊 Fetch Sales History
  @Get()
  async getAllSales() {
    return await this.salesService.getAllSales();
  }

  // 🧾 Fetch Single Invoice
  @Get(':id')
  async getSaleById(@Param('id') id: string) {
    return await this.salesService.getSaleById(id);
  }
}