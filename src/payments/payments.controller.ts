import { Controller, Get, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { QueryPaymentDto } from './dto/query-payment.dto';

// Read-only aggregation over the existing Payment table. To record or void a
// payment, use the endpoints that already do the real allocation work:
//   POST /customers/:id/receive-payment   POST /customers/payments/:id/void
//   POST /suppliers/:id/pay               POST /suppliers/payments/:id/void
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }
}