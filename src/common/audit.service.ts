import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    action: string;
    entity: string;
    entityId: string;
    userId?: string;
    userName?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          userId: data.userId,
          userName: data.userName,
          details: data.details ? data.details : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Audit logging failed:', error);
    }
  }
}
