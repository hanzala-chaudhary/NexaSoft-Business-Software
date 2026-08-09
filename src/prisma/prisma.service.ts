import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();

    // 🔍 DIAGNOSTIC — ye line batayegi Prisma Client ke paas asal mein
    // kaunse models available hain. Deploy logs mein "AVAILABLE PRISMA MODELS"
    // ke baad ki list dhoondo aur check karo GodamStockBalance wagera usme hai ya nahi.
    const modelNames = Object.keys(this).filter(
      (key) => !key.startsWith('_') && !key.startsWith('$') && typeof (this as any)[key] === 'object',
    );
    this.logger.log(`🔍 AVAILABLE PRISMA MODELS: ${JSON.stringify(modelNames)}`);

    // @ts-ignore
    this.$on('error', (e: any) => {
      this.logger.error('Prisma runtime error:', e);
    });
  }

  // Agar pehli koshish fail ho, turant crash mat karo — thodi der ruk kar dobara try karo
  private async connectWithRetry(retries = 5, delayMs = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.$connect();
        this.isConnected = true;
        this.logger.log('✅ Database connected successfully');
        return;
      } catch (error) {
        this.logger.warn(
          `⚠️ Database connect failed (attempt ${attempt}/${retries}). Retrying in ${delayMs / 1000}s...`,
        );
        if (attempt === retries) {
          this.logger.error(
            '❌ Database se connect nahi ho saka. Server chalta rahega, lekin database-related requests fail hongi jab tak DB wapas online na ho. Neon dashboard check karein.',
          );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}