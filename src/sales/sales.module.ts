import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Yeh line add karni hai

@Module({
  imports: [PrismaModule], // Yeh line add karni hai
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}