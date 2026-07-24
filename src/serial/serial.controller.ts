import { Controller, Get, Param } from '@nestjs/common';
import { SerialService } from './serial.service';

@Controller('serial')
export class SerialController {
  constructor(private readonly serialService: SerialService) {}

  @Get(':serialNumber')
  trackSerial(@Param('serialNumber') serialNumber: string) {
    return this.serialService.trackSerialNumber(serialNumber);
  }
}