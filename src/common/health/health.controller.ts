import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private healthService: HealthService,
  ) {}

  @Get()
  async check() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
        error: {},
        details: {
          database: {
            status: 'up',
          },
        },
      };
    } catch (error) {
      return {
        status: 'error',
        info: {},
        error: {
          database: {
            status: 'down',
            message: error.message,
          },
        },
        details: {
          database: {
            status: 'down',
          },
        },
      };
    }
  }

  @Get('ready')
  async readiness() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
        },
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unhealthy',
        },
        error: error.message,
      };
    }
  }

  @Get('live')
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  async getMetrics() {
    return this.healthService.getHealthMetrics();
  }
}
