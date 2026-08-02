import { Controller, Get, Post, Body } from '@nestjs/common';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  getCurrentShift() {
    return this.shiftsService.getCurrentShift();
  }

  @Post('open')
  openShift(@Body() body: { opening_cash: number; opened_by?: string }) {
    return this.shiftsService.openShift(body);
  }

  @Post('close')
  closeShift(@Body() body: { closing_cash: number; notes?: string }) {
    return this.shiftsService.closeShift(body);
  }

  @Get('history')
  getShiftHistory() {
    return this.shiftsService.getShiftHistory();
  }
}