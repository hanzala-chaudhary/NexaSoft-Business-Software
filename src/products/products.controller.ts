import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 🔍 Advanced Live Search (Name, SKU, Barcode)
  @Get('search')
  async searchProducts(@Query('q') q: string) {
    if (!q || q.trim() === '') return [];
    try {
      return await this.productsService.searchProducts(q);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 📦 Get All Products with Deep Relations (Brands, Categories)
  @Get()
  async getAllProducts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string
  ) {
    try {
      return await this.productsService.getAllProducts(Number(page), Number(limit), categoryId, brandId);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 🔫 Hardware Serial Number Native Scanner
  @Get('scan/:serial')
  async scanProduct(@Param('serial') serial: string) {
    try {
      return await this.productsService.scanSerialNumber(serial);
    } catch (error: any) {
      // 404 For Not Found, 400 for Invalid Status
      const status = error.message.includes('nahi mila') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      throw new HttpException(error.message, status);
    }
  }

  // ➕ Add New Hardware Product Catalog
  @Post()
  async createProduct(@Body() body: any) {
    try {
      return await this.productsService.createProduct(body);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // 🔄 Update Existing Product
  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.productsService.updateProduct(id, body);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ❌ Delete/Deactivate Product
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    try {
      return await this.productsService.deleteProduct(id);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}