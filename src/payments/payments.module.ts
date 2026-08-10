import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
// NOTE: adjust this import path if your PrismaModule lives elsewhere
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}

/**
 * Don't forget to register this in your app.module.ts:
 *
 *   import { PaymentsModule } from './payments/payments.module';
 *   @Module({ imports: [..., PaymentsModule] })
 */