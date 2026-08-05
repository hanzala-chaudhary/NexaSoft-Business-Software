import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(@Body() body: any) {
    try {
      return await this.salesService.createSale(body);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Sale create karne mein masla pesh aaya.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/return')
  async returnSale(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.salesService.processReturn(id, body);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Return process karne mein masla pesh aaya.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
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