import { Controller, Get, Param } from '@nestjs/common';
import { SerialService } from './serial.service';

@Controller('serial')
export class SerialController {
  constructor(private readonly serialService: SerialService) {}

  // Zaroori: ye route neeche wale ':serialNumber' route se PEHLE hona chahiye,
  // warna NestJS "product" ko bhi ek serial number samajh lega
  @Get('product/:productId')
  getInStockSerials(@Param('productId') productId: string) {
    return this.serialService.getInStockSerialsForProduct(productId);
  }

  @Get(':serialNumber')
  trackSerial(@Param('serialNumber') serialNumber: string) {
    return this.serialService.trackSerialNumber(serialNumber);
  }
}