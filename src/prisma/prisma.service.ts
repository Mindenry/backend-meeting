import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn']
          : ['query', 'info', 'warn', 'error'],
      // Connection pooling for better performance
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production') {
      this.$on('query' as never, (e: any) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    this.logger.log('Prisma disconnecting from database...');
    await this.$disconnect();
  }
}
