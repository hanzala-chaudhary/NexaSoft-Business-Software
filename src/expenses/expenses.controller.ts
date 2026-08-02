import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  createExpense(@Body() body: any) {
    return this.expensesService.createExpense(body);
  }

  @Get()
  getAllExpenses() {
    return this.expensesService.getAllExpenses();
  }

  @Delete(':id')
  deleteExpense(@Param('id') id: string) {
    return this.expensesService.deleteExpense(id);
  }
}