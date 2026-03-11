import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'org_owner')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 100,
    });
  }
}
