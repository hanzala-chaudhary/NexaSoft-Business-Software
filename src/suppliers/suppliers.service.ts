import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // 1. Create Supplier
  async create(data: any) {
    try {
      return await this.prisma.supplier.create({
        data: {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          company: data.company || null,
          address: data.address || null,
        },
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException("Supplier save nahi ho saka!");
    }
  }

  // 2. Get All Suppliers
  async findAll() {
    return this.prisma.supplier.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  // 3. Update Supplier
  async update(id: string, data: any) {
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          company: data.company,
          address: data.address,
        },
      });
    } catch (error) {
      throw new BadRequestException("Supplier update nahi ho saka!");
    }
  }

  // 4. Delete Supplier
  async remove(id: string) {
    try {
      return await this.prisma.supplier.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException("Yeh supplier pehle kisi purchase mein use ho chuka hai, is liye delete nahi ho sakta!");
    }
  }
}