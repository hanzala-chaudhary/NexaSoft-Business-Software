import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SerialService {
  constructor(private prisma: PrismaService) {}

  async trackSerialNumber(serialNumber: string) {
    const serialData = await this.prisma.serialized_products.findFirst({
      where: { serial_number: serialNumber },
      include: {
        products: true,
        supplier: true,
        purchase: true,
        customer: true,
        sale: true,
      },
    });

    if (!serialData) {
      throw new NotFoundException('Yeh serial number hamare record mein nahi mila!');
    }

    return serialData;
  }

  // Naya: kisi product ke saare abhi-tak-bikay-nahi serials (POS aur Products page ke liye)
  async getInStockSerialsForProduct(productId: string) {
    return this.prisma.serialized_products.findMany({
      where: { product_id: productId, status: 'IN_STOCK' },
      select: { id: true, serial_number: true, purchase_date: true },
      orderBy: { created_at: 'asc' },
    });
  }
}