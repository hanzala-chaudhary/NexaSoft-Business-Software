import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const slug = dto.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    try {
      return await this.prisma.brand.create({
        data: {
          name: dto.name.trim(),
          slug,
          country: dto.country || null,
        },
      });
    } catch (error) {
      console.error('Brand Create Error:', error);
      throw new BadRequestException('Brand save nahi ho saka!');
    }
  }

  async findAll() {
    return this.prisma.brand.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand nahi mila!');
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    try {
      return await this.prisma.brand.update({
        where: { id },
        data: { name: dto.name?.trim(), country: dto.country },
      });
    } catch (error) {
      throw new BadRequestException('Brand update nahi ho saka!');
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.brand.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Yeh brand kisi product mein use ho rahi hai, pehle unki brand change karein!');
      }
      throw new BadRequestException('Brand delete nahi ho saka!');
    }
  }
}