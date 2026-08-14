import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // =======================================================
  // 🔫 HARDWARE SERIAL SCANNER (FOR POS TERMINAL)
  // =======================================================
  async scanSerialNumber(serial_number: string) {
    const item = await this.prisma.serialized_products.findFirst({
      where: { serial_number },
      include: {
        products: {
          include: { category: true, brand: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Serial number '${serial_number}' hamare system mein majood nahi hai!`);
    }

    if (item.status === 'SOLD') {
      throw new BadRequestException(`Serial '${serial_number}' pehle hi kisi customer ko sale ho chuka hai!`);
    }
    if (item.status === 'RETURNED' || item.status === 'DAMAGED') {
      throw new BadRequestException(`Alert! Is hardware ka status '${item.status}' hai. Ise sale nahi kiya ja sakta.`);
    }

    return {
      serialId: item.id,
      serialNumber: item.serial_number,
      productId: item.products.id,
      productName: item.products.name,
      brand: item.products.brand?.name || 'Unknown',
      category: item.products.category?.name || 'Unknown',
      purchaseCost: Number(item.products.purchasePrice) || 0,
      price: Number(item.products.salePrice) || 0,
    };
  }

  // =======================================================
  // 🔍 SMART SEARCH ENGINE (AUTO-COMPLETE)
  // =======================================================
  async searchProducts(query: string) {
    const q = query.trim();
    if (!q) return this.getAllProducts();

    const directMatches = await this.prisma.product.findMany({
      where: {
        deleted_at: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { master_barcode: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { category: true, brand: true },
    });

    const serialMatches = await this.prisma.serialized_products.findMany({
      where: { serial_number: { contains: q, mode: 'insensitive' } },
      include: {
        products: { include: { category: true, brand: true } },
        sale: true,
        customer: true,
      },
      take: 30,
    });

    const resultMap = new Map<string, any>();

    for (const p of directMatches) {
      resultMap.set(p.id, { ...p, matchedSerials: [] as any[] });
    }

    for (const s of serialMatches) {
      const p = s.products;
      if (!resultMap.has(p.id)) {
        resultMap.set(p.id, { ...p, matchedSerials: [] as any[] });
      }
      resultMap.get(p.id).matchedSerials.push({
        serial_number: s.serial_number,
        status: s.status,
        saleInvoice: s.sale?.invoice_number || null,
        saleDate: s.sale?.created_at || null,
        customerName: s.customer?.name || null,
      });
    }

    return Array.from(resultMap.values());
  }

  // =======================================================
  // 🧯 SHARED ERROR TRANSLATOR
  // Generic "database mein save nahi ho saka" ki jagah exact wajah batata hai —
  // duplicate barcode, invalid category/brand, ya koi aur specific Prisma error.
  // =======================================================
  private friendlyDbError(error: unknown, entityLabel: string): BadRequestException {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | string | undefined;
        const fields = Array.isArray(target) ? target.join(', ') : String(target ?? '');

        if (fields.includes('master_barcode')) {
          return new BadRequestException('Yeh barcode pehle se kisi aur product mein use ho raha hai!');
        }
        if (fields.includes('sku')) {
          return new BadRequestException('Yeh SKU pehle se maujood hai — dobara try karein.');
        }
        if (fields.includes('slug')) {
          return new BadRequestException('Isi naam ka product pehle se maujood hai.');
        }
        return new BadRequestException(`Yeh entry (${fields || 'field'}) pehle se maujood hai!`);
      }

      if (error.code === 'P2003') {
        return new BadRequestException(
          'Selected category ya brand system mein nahi mila. Page refresh karke dobara try karein.',
        );
      }
    }

    console.error(`❌ ${entityLabel} Database Error:`, error);
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    return new BadRequestException(`${entityLabel} database mein save nahi ho saka! (${rawMessage})`);
  }

  // =======================================================
  // ➕ CREATE NEW PRODUCT CATALOG
  // =======================================================
  async createProduct(data: any) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Product ka naam zaroori hai!');
    }
    if (data.salePrice === undefined || data.salePrice === null || isNaN(Number(data.salePrice))) {
      throw new BadRequestException('Sale price zaroori hai aur number honi chahiye!');
    }
    if (data.purchasePrice === undefined || data.purchasePrice === null || isNaN(Number(data.purchasePrice))) {
      throw new BadRequestException('Purchase price zaroori hai aur number honi chahiye!');
    }

    // Category/Brand agar diye gaye hain, unka wajood pehle hi check kar lo —
    // warna foreign-key error generic "database mein save nahi ho saka" bata deta tha
    // aur client ko pata hi nahi chalta tha ke asal masla category select karne mein tha
    if (data.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: data.categoryId, deleted_at: null },
      });
      if (!category) {
        throw new BadRequestException('Selected category system mein nahi mili. Pehle category add karein.');
      }
    }
    if (data.brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: data.brandId, deleted_at: null },
      });
      if (!brand) {
        throw new BadRequestException('Selected brand system mein nahi mila. Pehle brand add karein.');
      }
    }

    const generatedSku = `PRD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedSlug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    try {
      return await this.prisma.product.create({
        data: {
          name: data.name.trim(),
          sku: generatedSku,
          slug: generatedSlug,
          master_barcode: data.isSerialized ? null : data.masterBarcode?.trim() || null,
          purchasePrice: Number(data.purchasePrice) || 0,
          salePrice: Number(data.salePrice),
          opening_stock: Number(data.openingStock) || 0,
          categoryId: data.categoryId || undefined,
          brandId: data.brandId || undefined,
          is_serialized: data.isSerialized ?? false,
          is_active: true,
        },
      });
    } catch (error) {
      throw this.friendlyDbError(error, 'Product');
    }
  }

  // =======================================================
  // 📦 GET ALL PRODUCTS
  // =======================================================
  async getAllProducts() {
    return this.prisma.product.findMany({
      where: { deleted_at: null },
      orderBy: { createdAt: 'desc' },
      include: { category: true, brand: true },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deleted_at: null },
    });
    if (!product) {
      throw new NotFoundException('Product nahi mila ya delete ho chuka hai!');
    }
    return product;
  }

  // =======================================================
  // 🔄 UPDATE PRODUCT
  // =======================================================
  async updateProduct(id: string, data: any) {
    await this.getProductById(id);

    if (data.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: data.categoryId, deleted_at: null },
      });
      if (!category) {
        throw new BadRequestException('Selected category system mein nahi mili. Pehle category add karein.');
      }
    }
    if (data.brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: data.brandId, deleted_at: null },
      });
      if (!brand) {
        throw new BadRequestException('Selected brand system mein nahi mila. Pehle brand add karein.');
      }
    }

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          master_barcode: data.isSerialized ? null : data.masterBarcode?.trim() || null,
          purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
          salePrice: data.salePrice !== undefined ? Number(data.salePrice) : undefined,
          opening_stock: data.openingStock !== undefined ? Number(data.openingStock) : undefined,
          categoryId: data.categoryId || undefined,
          brandId: data.brandId || undefined,
          is_serialized: data.isSerialized !== undefined ? data.isSerialized : undefined,
        },
      });
    } catch (error) {
      throw this.friendlyDbError(error, 'Product');
    }
  }

  // =======================================================
  // ❌ DELETE PRODUCT (ENTERPRISE SOFT DELETE)
  // =======================================================
  async deleteProduct(id: string) {
    await this.getProductById(id);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          is_active: false,
        },
      });
    } catch (error) {
      console.error('Delete Error:', error);
      throw new BadRequestException('Product delete karte waqt error aaya!');
    }
  }
}