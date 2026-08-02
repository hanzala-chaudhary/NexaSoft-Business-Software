import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: {
          name: data.name.trim(),
          phone: data.phone || null,
          email: data.email || null,
          company: data.company || null,
          address: data.address || null,
        },
      });
    } catch (error) {
      console.error('Supplier Create Error:', error);
      throw new BadRequestException('Supplier save nahi ho saka!');
    }
  }

  async findAll() {
    return this.prisma.supplier.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Supplier nahi mila!');
    }
    return supplier;
  }

  async update(id: string, data: UpdateSupplierDto) {
    await this.findOne(id);
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          phone: data.phone,
          email: data.email,
          company: data.company,
          address: data.address,
        },
      });
    } catch (error) {
      console.error('Supplier Update Error:', error);
      throw new BadRequestException('Supplier update nahi ho saka!');
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.supplier.delete({ where: { id } });
    } catch (error) {
      throw new BadRequestException(
        'Yeh supplier pehle kisi purchase mein use ho chuka hai, is liye delete nahi ho sakta!',
      );
    }
  }
}