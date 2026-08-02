import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description || null,
        },
      });
    } catch (error) {
      console.error('Category Create Error:', error);
      throw new BadRequestException('Category save nahi ho saki!');
    }
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: { deleted_at: null },
      orderBy: { display_order: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category nahi mili!');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description,
        },
      });
    } catch (error) {
      console.error('Category Update Error:', error);
      throw new BadRequestException('Category update nahi ho saki!');
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Yeh category kisi product mein use ho rahi hai, pehle un products ki category change karein!',
        );
      }
      throw new BadRequestException('Category delete nahi ho saki!');
    }
  }
}