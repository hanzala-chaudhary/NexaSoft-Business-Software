import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Zaroori: 'search' route upar rakha hai, taake ':id' jaisa koi route isse na tokay
  @Get('search')
  searchProducts(@Query('q') q: string) {
    return this.productsService.searchProducts(q || '');
  }

  @Get()
  getAllProducts() {
    return this.productsService.getAllProducts();
  }

  @Get('scan/:serial')
  scanProduct(@Param('serial') serial: string) {
    return this.productsService.scanSerialNumber(serial);
  }

  @Post()
  createProduct(@Body() body: CreateProductDto) {
    return this.productsService.createProduct(body);
  }

  @Put(':id')
  updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.productsService.updateProduct(id, body);
  }

  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}