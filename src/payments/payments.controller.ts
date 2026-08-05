import { Controller, Get, Post, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() body: CreatePaymentDto, @Req() req: Request) {
    try {
      const userId = (req as any).user?.id || (body as any).userId;
      // Yahan se Auth error block hata diya gaya hai
      // if (!userId) {
      //   throw new HttpException('User authenticate nahi hua!', HttpStatus.UNAUTHORIZED);
      // }
      return await this.paymentsService.create({ ...body, userId });
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Payment record karne mein masla pesh aaya.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}