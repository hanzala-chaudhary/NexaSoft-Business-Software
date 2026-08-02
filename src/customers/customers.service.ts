import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException("Customer ka naam zaroori hai!");
    }

    // Phone number duplication check
    if (dto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone.trim() },
      });
      if (existing) {
        throw new BadRequestException("Yeh phone number pehle se kisi customer ke paas registered hai!");
      }
    }

    try {
      return await this.prisma.customer.create({
        data: {
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });
    } catch (error) {
      console.error('Customer Create Error:', error);
      throw new BadRequestException('Customer save nahi ho saka!');
    }
  }

  // Agar phone diya gaya hai aur wo pehle se maujood hai, wahi customer return karo (repeat customer detect).
  // Warna naya bana do. Agar phone hi nahi diya (sirf naam), hamesha naya "walk-in" record banega.
  async findOrCreate(dto: CreateCustomerDto) {
    if (dto.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone.trim() },
      });
      if (existing) return existing;
    }
    return this.create(dto);
  }

  // HIGH-END UPGRADE: Frontend ko customer ki purchase history bhi bhejna zaroori hai
  async findAll() {
    return this.prisma.customer.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: {
        // Ye hissa frontend pe 'Total Spend' aur 'Total Invoices' dikhane ke kaam aayega
        sales: {
          where: { deleted_at: null },
          select: { total_amount: true, invoice_number: true, sale_date: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: true,
      }
    });
    if (!customer) throw new NotFoundException('Customer nahi mila!');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(id);

    // Agar phone number change kiya gaya hai, to check karo ke kahin kisi doosre customer ka number to nahi
    if (dto.phone && dto.phone.trim() !== customer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { phone: dto.phone.trim() },
      });
      if (existing) {
        throw new BadRequestException('Yeh phone number pehle se kisi aur customer ke paas registered hai!');
      }
    }

    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
        },
      });
    } catch (error) {
      throw new BadRequestException('Customer update nahi ho saka!');
    }
  }

  async remove(id: string) {
    // Sirf us customer ko fetch karo, aur uski total sales count bhi nikalo
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { sales: true } } }
    });
    
    if (!customer) throw new NotFoundException('Customer nahi mila!');

    // HIGH-END DATA INTEGRITY: Delete hone se pehle rok lo agar sale ho chuki hai
    if (customer._count.sales > 0) {
      throw new BadRequestException(`Is customer ki ${customer._count.sales} Invoices system mein maujood hain. Data integrity kharab hone se bachane ke liye isay delete nahi kiya ja sakta!`);
    }

    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (error) {
      throw new BadRequestException('Customer delete nahi ho saka!');
    }
  }
}