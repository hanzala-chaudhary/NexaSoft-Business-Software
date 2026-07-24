import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { PurchasesController } from './purchases/purchases.controller';
import { PurchasesService } from './purchases/purchases.service';
import { SalesController } from './sales/sales.controller';
import { SalesService } from './sales/sales.service';
import { SerialController } from './serial/serial.controller';
import { SerialService } from './serial/serial.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';

@Module({
  imports: [],
  controllers: [
    AppController, 
    ProductsController, 
    SuppliersController, 
    PurchasesController, 
    SalesController,
    SerialController,
    DashboardController
  ],
  providers: [
    AppService, 
    PrismaService, 
    ProductsService, 
    SuppliersService, 
    PurchasesService, 
    SalesService,
    SerialService,
    DashboardService
  ],
})
export class AppModule {}