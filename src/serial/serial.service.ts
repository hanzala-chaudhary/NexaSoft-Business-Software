import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SerialService {
  constructor(private prisma: PrismaService) {}

  async trackSerialNumber(serialNumber: string) {
    // Database mein serial number dhoondein aur uski poori history nikalen
    const serialData = await this.prisma.serialized_products.findFirst({
      where: {
        serial_number: serialNumber,
      },
      include: {
        products: true, // Product ki details
        supplier: true, // Kis se khareeda
        purchase: true, // Purchase invoice
        customer: true, // Kisko becha (agar becha hai)
        sale: true,     // Sale invoice
      },
    });

    if (!serialData) {
      throw new NotFoundException('Yeh serial number hamare record mein nahi mila!');
    }

    return serialData;
  }
}