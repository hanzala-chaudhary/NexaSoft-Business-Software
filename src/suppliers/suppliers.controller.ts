import { Controller, Get, Post, Body, Put, Param, Delete, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() body: CreateSupplierDto) {
    return this.suppliersService.create(body);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.suppliersService.findAll(search);
  }

  // Galti se dali gayi payment reverse karo — ":id" route se pehle define taake clash na ho
  @Post('payments/:paymentId/void')
  voidPayment(@Param('paymentId') paymentId: string) {
    return this.suppliersService.voidPayment(paymentId);
  }

  // Supplier ka poora khata — purchases + payments + running balance
  @Get(':id/ledger')
  getLedger(@Param('id') id: string) {
    return this.suppliersService.getLedger(id);
  }

  // Sirf current due balance — Dashboard/Reports isi ko call karein
  @Get(':id/due-balance')
  getDueBalance(@Param('id') id: string) {
    return this.suppliersService.getDueBalance(id);
  }

  // Sirf payment history
  @Get(':id/payments')
  getPaymentHistory(@Param('id') id: string) {
    return this.suppliersService.getPaymentHistory(id);
  }

  // Bina nayi purchase ke, supplier ko payment do (partial ya poora)
  @Post(':id/pay')
  paySupplier(
    @Param('id') id: string,
    @Body() body: { amount: number; method?: string; referenceNumber?: string; notes?: string; userId?: string },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id || body.userId;
    return this.suppliersService.paySupplier(id, { ...body, userId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateSupplierDto) {
    return this.suppliersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}