import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealthMetrics() {
    const startTime = Date.now();
    
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - startTime;

      // Get basic metrics
      const [userCount, teamCount, taskCount, meetingCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.team.count(),
        this.prisma.task.count(),
        this.prisma.meeting.count(),
      ]);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: 'connected',
          responseTime: `${dbResponseTime}ms`,
        },
        metrics: {
          users: userCount,
          teams: teamCount,
          tasks: taskCount,
          meetings: meetingCount,
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: 'disconnected',
          error: error.message,
        },
      };
    }
  }
}
