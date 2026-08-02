import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExpensesModule } from './expenses/expenses.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { SerialModule } from './serial/serial.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BrandsModule } from './brands/brands.module';
import { CustomersModule } from './customers/customers.module';
import { ShiftsModule } from './shifts/shifts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ExpensesModule,
    CategoriesModule,
    ProductsModule,
    BrandsModule,
    CustomersModule,
    SuppliersModule,
    PurchasesModule,
    SalesModule,
    SerialModule,
    DashboardModule,
    ShiftsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}