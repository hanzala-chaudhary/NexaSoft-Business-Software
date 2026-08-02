import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { PrismaService } from '../prisma/prisma.service'; // Agar PrismaModule hai to wo import kar lein

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, PrismaService],
})
export class ExpensesModule {}