import { Controller, Get, Post, Body, Put, Param, Delete, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  // POS checkout ke liye — naam/phone se customer dhoondo, na mile to naya bana do
  @Post('find-or-create')
  findOrCreate(@Body() dto: CreateCustomerDto) {
    return this.customersService.findOrCreate(dto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.customersService.findAll(search);
  }

  // Galti se dali gayi payment reverse karo — customer.:id se pehle define taake
  // Nest ":id" route se clash na ho
  @Post('payments/:paymentId/void')
  voidPayment(@Param('paymentId') paymentId: string) {
    return this.customersService.voidPayment(paymentId);
  }

  // Customer ka poora khata — sales + payments + running balance
  @Get(':id/ledger')
  getLedger(@Param('id') id: string) {
    return this.customersService.getLedger(id);
  }

  // Sirf current due balance — Dashboard/Reports isi ko call karein
  @Get(':id/due-balance')
  getDueBalance(@Param('id') id: string) {
    return this.customersService.getDueBalance(id);
  }

  // Sirf payment history — date, amount, uss waqt ka remaining balance, reference
  @Get(':id/payments')
  getPaymentHistory(@Param('id') id: string) {
    return this.customersService.getPaymentHistory(id);
  }

  // Bina naye sale ke, customer ke against payment record karo (partial ya poora)
  @Post(':id/receive-payment')
  receivePayment(
    @Param('id') id: string,
    @Body() body: { amount: number; method?: string; referenceNumber?: string; notes?: string; userId?: string },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id || body.userId;
    return this.customersService.receivePayment(id, { ...body, userId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}