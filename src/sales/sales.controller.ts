import { Controller, Post, Body, Get } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  createSale(@Body() body: any) {
    return this.salesService.createSale(body);
  }

  @Get()
  getAllSales() {
    return this.salesService.getAllSales();
  }
}