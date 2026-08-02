import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  createSale(@Body() body: any) {
    return this.salesService.createSale(body);
  }

  // --- NAYA RETURN ROUTE ---
  @Post(':id/return')
  returnSale(@Param('id') id: string, @Body() body: any) {
    return this.salesService.processReturn(id, body);
  }

  @Get()
  getAllSales() {
    return this.salesService.getAllSales();
  }

  @Get(':id')
  getSaleById(@Param('id') id: string) {
    return this.salesService.getSaleById(id);
  }
}