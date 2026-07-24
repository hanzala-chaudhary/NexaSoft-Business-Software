import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async scanSerialNumber(serial_number: string) {
    const item = await this.prisma.serialized_products.findFirst({
      where: { serial_number },
      include: { products: true }, 
    });
    
    if (!item) {
      throw new NotFoundException('Yeh serial number hamare system mein majood nahi hai!');
    }
    return item;
  }

  async createProduct(data: any) {
    try {
      // 1. Auto-generate SKU
      const generatedSku = `PRD-${Math.floor(10000 + Math.random() * 90000)}`;
      
      // 2. Auto-generate unique Slug (e.g. "ram-8gb-1698765432")
      const generatedSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

      return await this.prisma.product.create({
        data: {
          name: data.name,
          sku: generatedSku, 
          slug: generatedSlug,
          master_barcode: data.masterBarcode || null,
          purchasePrice: Number(data.purchasePrice) || 0,
          salePrice: Number(data.salePrice) || 0,
          opening_stock: Number(data.openingStock) || 0,
          notes: `Category: ${data.category || 'N/A'}`, 
          is_active: true,
        }
      });
    } catch (error) {
      console.error("❌ Prisma Database Error:", error);
      throw new BadRequestException("Product database mein save nahi ho saka!");
    }
  }

  async getAllProducts() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // Product Update karne ke liye
  async updateProduct(id: string, data: any) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          master_barcode: data.masterBarcode,
          purchasePrice: Number(data.purchasePrice),
          salePrice: Number(data.salePrice),
          opening_stock: Number(data.openingStock),
          notes: `Category: ${data.category || 'N/A'}`,
        },
      });
    } catch (error) {
      console.error("Update Error:", error);
      throw new BadRequestException("Product update nahi ho saka!");
    }
  }

  // Product Delete karne ke liye (Force Delete)
  async deleteProduct(id: string) {
    try {
      // Step 1: Pehle is product ke tamam Serial Numbers delete karein
      await this.prisma.serialized_products.deleteMany({
        where: { product_id: id },
      }).catch(() => null); 

      // Step 2: Ab main product aaram se delete ho jayega
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Delete Error:", error);
      throw new BadRequestException("Yeh product pehle kisi Sale/Bill mein use ho chuka hai is liye delete nahi ho sakta!");
    }
  }
}