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
          include: { category: true, brand: true } 
        } 
      },
    });

    if (!item) {
      throw new NotFoundException(`Serial number '${serial_number}' hamare system mein majood nahi hai!`);
    }

    // 🔴 VIP FIX: POS Validation - Check if item is already sold or damaged
    if (item.status === 'SOLD') {
      throw new BadRequestException(`Serial '${serial_number}' pehle hi kisi customer ko sale ho chuka hai!`);
    }
    if (item.status === 'RETURNED' || item.status === 'DAMAGED') {
      throw new BadRequestException(`Alert! Is hardware ka status '${item.status}' hai. Ise sale nahi kiya ja sakta.`);
    }

    // Return exact format required by our React POS Frontend
    return {
      serialId: item.id,
      serialNumber: item.serial_number,
      productId: item.products.id,
      productName: item.products.name,
      brand: item.products.brand?.name || 'Unknown',
      category: item.products.category?.name || 'Unknown',
      purchaseCost: Number(item.products.purchasePrice) || 0,
      price: Number(item.products.salePrice) || 0
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
      take: 30, // Limit optimized for fast performance
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
    
    const generatedSku = `PRD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedSlug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    try {
      return await this.prisma.product.create({
        data: {
          name: data.name.trim(),
          sku: generatedSku,
          slug: generatedSlug,
          // Serialized product ho to master_barcode kabhi save nahi karte
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Yeh barcode pehle se kisi aur product mein use ho raha hai!');
      }
      console.error('❌ Prisma Database Error:', error);
      throw new BadRequestException('Product database mein save nahi ho saka!');
    }
  }

  // =======================================================
  // 📦 GET ALL PRODUCTS
  // =======================================================
  async getAllProducts() {
    return this.prisma.product.findMany({
      where: { deleted_at: null }, // Sirf active items
      orderBy: { createdAt: 'desc' }, // 🔴 VIP FIX: 'created_at' ko 'createdAt' kiya
      include: { category: true, brand: true },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findFirst({ 
      where: { id, deleted_at: null } 
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Yeh barcode pehle se kisi aur product mein use ho raha hai!');
      }
      console.error('Update Error:', error);
      throw new BadRequestException('Product update nahi ho saka!');
    }
  }

  // =======================================================
  // ❌ DELETE PRODUCT (ENTERPRISE SOFT DELETE)
  // =======================================================
  async deleteProduct(id: string) {
    await this.getProductById(id);

    try {
      // 🔴 VIP FIX: Hard delete (deleteMany) ki bajaye Soft Delete taake Invoice history zinda rahay
      return await this.prisma.product.update({
        where: { id },
        data: { 
          deleted_at: new Date(),
          is_active: false 
        },
      });
    } catch (error) {
      console.error('Delete Error:', error);
      throw new BadRequestException('Product delete karte waqt error aaya!');
    }
  }
}