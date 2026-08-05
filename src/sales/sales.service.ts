import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(data: any) {
    const { items, customerId, customerName, customerPhone, discount = 0, paidAmount = 0 } = data;

    if (!items || items.length === 0) throw new BadRequestException('Cart is empty!');

    // 🔥 MAGIC FIX: Agar salesman na mile toh auto user select/create karlo
    let finalUserId = data.userId;
    if (!finalUserId) {
      const fallbackUser = await (this.prisma as any).user.findFirst();
      if (fallbackUser) {
        finalUserId = fallbackUser.id;
      } else {
        // Agar database bilkul khali hai toh naya Admin bana do
        let role = await (this.prisma as any).role.findFirst();
        if (!role) {
            role = await (this.prisma as any).role.create({ data: { name: 'Admin', description: 'Auto Generated' } });
        }
        const newUser = await (this.prisma as any).user.create({
            data: { name: 'POS Admin', email: 'admin@nexasoft.com', password: '123', roleId: role.id }
        });
        finalUserId = newUser.id;
      }
    }

    return await this.prisma.$transaction(async (prisma) => {
      let finalCustomerId: string | null = null;

      // 📒 KHATA (CUSTOMER) LOGIC
      if (customerId) {
        finalCustomerId = customerId;
      } else if (customerPhone || (customerName && customerName !== 'Walk-in Customer')) {
        const nameToSave = customerName || 'Unknown Customer';
        if (customerPhone) {
          const existing = await (prisma as any).customer.findUnique({ where: { phone: customerPhone } });
          if (existing) finalCustomerId = existing.id;
          else {
            const newCust = await (prisma as any).customer.create({ data: { name: nameToSave, phone: customerPhone } });
            finalCustomerId = newCust.id;
          }
        } else {
          const newCust = await (prisma as any).customer.create({ data: { name: nameToSave } });
          finalCustomerId = newCust.id;
        }
      }

      // 💰 PRICE CALCULATIONS
      let calculatedSubTotal = 0;
      for (const item of items) {
        calculatedSubTotal += Number(item.salePrice) * Number(item.quantity);
      }

      const grandTotal = calculatedSubTotal - Number(discount);
      const finalPaidAmount = Number(paidAmount);
      
      let dynamicPaymentStatus = 'PAID';
      if (finalPaidAmount <= 0) dynamicPaymentStatus = 'PENDING';
      else if (finalPaidAmount < grandTotal) dynamicPaymentStatus = 'PARTIAL';

      const invoiceNumber = `INV-SALE-${Date.now()}`;

      // 📝 CREATE SALE RECORD
      const sale = await (prisma as any).sale.create({
        data: {
          invoiceNumber: invoiceNumber,
          totalAmount: grandTotal, 
          discount: Number(discount),
          paidAmount: finalPaidAmount,
          paymentStatus: dynamicPaymentStatus,
          customerId: finalCustomerId,
          userId: finalUserId,
        },
      });

      // 🏦 PAYMENT LEDGER (Udhaar & Cash Entry)
      if (finalPaidAmount > 0) {
        await (prisma as any).payment.create({
          data: {
            saleId: sale.id,
            userId: finalUserId,
            amount: finalPaidAmount,
            method: 'CASH',
            type: 'SALE_PAYMENT',
            referenceNumber: `REC-${invoiceNumber}`,
          }
        });
      }

      // 📦 INVENTORY & SERIALS LOGIC
      for (const item of items) {
        const product = await (prisma as any).product.findUnique({ where: { id: item.productId } });
        if (!product) throw new BadRequestException(`Product nahi mili!`);
        
        const stock = product.currentStock ?? product.current_stock ?? product.opening_stock ?? 0;
        if (Number(stock) < item.quantity) throw new BadRequestException(`Stock khatam hai!`);

        const saleItem = await (prisma as any).saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(item.salePrice),
            totalPrice: Number(item.salePrice) * item.quantity,
          },
        });

        const parallelTasks: any[] = [
          (prisma as any).product.update({
            where: { id: item.productId },
            data: product.currentStock !== undefined 
                  ? { currentStock: { decrement: item.quantity } } 
                  : { opening_stock: { decrement: item.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              productId: item.productId,
              action: 'SALE',
              quantity: -item.quantity,
              saleId: sale.id,
              userId: finalUserId,
              notes: `Sold via POS`,
            },
          })
        ];

        if (item.serialNumbers && item.serialNumbers.length > 0) {
          parallelTasks.push(
            (prisma as any).productSerial.updateMany({
              where: { serialNumber: { in: item.serialNumbers }, productId: item.productId },
              data: {
                status: 'SOLD',
                saleItemId: saleItem.id,
                customerId: finalCustomerId,
                salePrice: Number(item.salePrice),
                saleDate: new Date(),
              },
            })
          );
        }
        await Promise.all(parallelTasks);
      }

      return await (prisma as any).sale.findUnique({
        where: { id: sale.id },
        include: { customer: true, items: { include: { product: true } } },
      });
    }, { maxWait: 20000, timeout: 120000 });
  }

  // --- RETURN LOGIC ---
  async processReturn(saleId: string, data: any) {
    const { itemsToReturn } = data;
    if (!itemsToReturn || itemsToReturn.length === 0) throw new BadRequestException('Koi item select nahi kiya!');

    let finalUserId = data.userId;
    if (!finalUserId) {
      const fallbackUser = await (this.prisma as any).user.findFirst();
      finalUserId = fallbackUser?.id;
    }

    return await this.prisma.$transaction(async (prisma) => {
      let totalRefundAmount = 0;

      for (const returnItem of itemsToReturn) {
        const saleItem = await (prisma as any).saleItem.findFirst({
          where: { saleId: saleId, productId: returnItem.productId },
        });

        if (!saleItem || saleItem.quantity < returnItem.quantity) throw new BadRequestException('Invalid return quantity!');

        const unitPrice = saleItem.salePrice ?? saleItem.unitPrice ?? 0;
        const refundValue = Number(unitPrice) * returnItem.quantity;
        totalRefundAmount += refundValue;

        const returnTasks: any[] = [];

        if (saleItem.quantity === returnItem.quantity) {
          returnTasks.push((prisma as any).saleItem.delete({ where: { id: saleItem.id } }));
        } else {
          returnTasks.push((prisma as any).saleItem.update({
            where: { id: saleItem.id },
            data: { quantity: { decrement: returnItem.quantity }, totalPrice: { decrement: refundValue } },
          }));
        }

        const product = await (prisma as any).product.findUnique({ where: { id: returnItem.productId } });
        
        returnTasks.push(
          (prisma as any).product.update({
            where: { id: returnItem.productId },
            data: product.currentStock !== undefined 
                  ? { currentStock: { increment: returnItem.quantity } }
                  : { opening_stock: { increment: returnItem.quantity } },
          }),
          (prisma as any).inventoryTransaction.create({
            data: {
              productId: returnItem.productId,
              action: 'RETURN',
              quantity: returnItem.quantity,
              saleId: saleId,
              userId: finalUserId,
              notes: 'Returned',
            },
          })
        );

        if (returnItem.serialNumbers && returnItem.serialNumbers.length > 0) {
          returnTasks.push(
            (prisma as any).productSerial.updateMany({
              where: { serialNumber: { in: returnItem.serialNumbers }, saleItemId: saleItem.id },
              data: { status: 'IN_STOCK', saleItemId: null, customerId: null, saleDate: null },
            })
          );
        }
        await Promise.all(returnTasks);
      }

      const updatedSale = await (prisma as any).sale.update({
        where: { id: saleId },
        data: { totalAmount: { decrement: totalRefundAmount }, paidAmount: { decrement: totalRefundAmount } },
        include: { items: { include: { product: true } }, customer: true }
      });

      if (Number(updatedSale.totalAmount) <= 0) {
         await (prisma as any).sale.update({ where: { id: saleId }, data: { paymentStatus: 'REFUNDED', orderStatus: 'CANCELLED' } });
      }
      return { message: "Return successful", refundAmount: totalRefundAmount, sale: updatedSale };
    }, { maxWait: 20000, timeout: 120000 });
  }

  async getAllSales() {
    return await (this.prisma as any).sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: true, items: { include: { product: true } } },
    });
  }

  async getSaleById(id: string) {
    const sale = await (this.prisma as any).sale.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } }, serialized_products: true },
    });
    if (!sale) throw new NotFoundException('Sale record nahi mila!');
    return sale;
  }
}