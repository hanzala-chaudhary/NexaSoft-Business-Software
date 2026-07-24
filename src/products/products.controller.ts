import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 1. Get All Products
  @Get()
  getAllProducts() {
    return this.productsService.getAllProducts();
  }

  // 2. Scan Hardware Serial (POS ke liye)
  @Get('scan/:serial')
  scanProduct(@Param('serial') serial: string) {
    return this.productsService.scanSerialNumber(serial);
  }

  // 3. Create New Product
  @Post()
  createProduct(@Body() body: any) {
    return this.productsService.createProduct(body);
  }

  // 4. Update Existing Product (Ye fix karega "Cannot PUT")
  @Put(':id')
  updateProduct(@Param('id') id: string, @Body() body: any) {
    return this.productsService.updateProduct(id, body);
  }

  // 5. Delete Product (Ye fix karega "Cannot DELETE")
  @Delete(':id')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}