import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class TimeTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createTimeEntry(data: {
    userId: string;
    taskId?: string;
    meetingId?: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    billable?: boolean;
    tags?: string[];
  }) {
    let calculatedDuration = data.duration;

    if (data.endTime && !calculatedDuration) {
      calculatedDuration = Math.floor(
        (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 1000,
      );
    }

    if (calculatedDuration && calculatedDuration < 0) {
      throw new BadRequestException('End time must be after start time');
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        ...data,
        duration: calculatedDuration,
        tags: data.tags || [],
      },
      include: {
        user: true,
        task: {
          include: {
            assignee: true,
            team: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'time_entry',
      entityId: entry.id,
      userId: data.userId,
      details: {
        taskId: data.taskId,
        meetingId: data.meetingId,
        duration: calculatedDuration,
      },
    });

    return entry;
  }

  async getTimeEntries(filters: {
    userId?: string;
    taskId?: string;
    meetingId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.taskId) where.taskId = filters.taskId;
    if (filters.meetingId) where.meetingId = filters.meetingId;

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.startTime.lte = filters.endDate;
      }
    }

    return this.prisma.timeEntry.findMany({
      where,
      include: {
        user: true,
        task: {
          include: {
            assignee: true,
            team: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async getTimeEntry(id: string) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: true,
        task: {
          include: {
            assignee: true,
            team: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    return entry;
  }

  async updateTimeEntry(
    id: string,
    data: {
      description?: string;
      startTime?: Date;
      endTime?: Date;
      duration?: number;
      billable?: boolean;
      tags?: string[];
    },
    userId: string,
  ) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    if (entry.userId !== userId) {
      throw new BadRequestException('You can only update your own time entries');
    }

    let calculatedDuration = data.duration;

    if (data.endTime && data.startTime && !calculatedDuration) {
      calculatedDuration = Math.floor(
        (new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 1000,
      );
    } else if (data.endTime && !calculatedDuration) {
      calculatedDuration = Math.floor(
        (new Date(data.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000,
      );
    }

    if (calculatedDuration && calculatedDuration < 0) {
      throw new BadRequestException('End time must be after start time');
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...data,
        duration: calculatedDuration || entry.duration,
      },
      include: {
        user: true,
        task: true,
      },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'time_entry',
      entityId: id,
      userId,
      details: data,
    });

    return updated;
  }

  async deleteTimeEntry(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    if (entry.userId !== userId) {
      throw new BadRequestException('You can only delete your own time entries');
    }

    await this.prisma.timeEntry.delete({ where: { id } });

    await this.auditService.log({
      action: 'delete',
      entity: 'time_entry',
      entityId: id,
      userId,
      details: { taskId: entry.taskId, meetingId: entry.meetingId },
    });

    return { success: true };
  }

  async getTimeReport(filters: {
    userId?: string;
    teamId?: string;
    startDate: Date;
    endDate: Date;
  }) {
    const where: any = {
      startTime: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.userId) {
      where.userId = filters.userId;
    } else if (filters.teamId) {
      // Get all users in team
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { teamId: filters.teamId },
        select: { userId: true },
      });
      where.userId = {
        in: teamMembers.map(m => m.userId),
      };
    }

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: true,
        task: {
          include: {
            team: true,
          },
        },
      },
    });

    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const billableSeconds = entries
      .filter(e => e.billable)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0);

    const byUser = entries.reduce((acc, entry) => {
      const userId = entry.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          totalSeconds: 0,
          billableSeconds: 0,
          entries: [],
        };
      }
      acc[userId].totalSeconds += entry.duration || 0;
      if (entry.billable) {
        acc[userId].billableSeconds += entry.duration || 0;
      }
      acc[userId].entries.push(entry);
      return acc;
    }, {} as any);

    const byTask = entries
      .filter(e => e.taskId)
      .reduce((acc, entry) => {
        const taskId = entry.taskId!;
        if (!acc[taskId]) {
          acc[taskId] = {
            task: entry.task,
            totalSeconds: 0,
            entries: [],
          };
        }
        acc[taskId].totalSeconds += entry.duration || 0;
        acc[taskId].entries.push(entry);
        return acc;
      }, {} as any);

    return {
      summary: {
        totalHours: totalSeconds / 3600,
        billableHours: billableSeconds / 3600,
        totalEntries: entries.length,
        period: {
          start: filters.startDate,
          end: filters.endDate,
        },
      },
      byUser: Object.values(byUser),
      byTask: Object.values(byTask),
      entries,
    };
  }
}
