import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class MinutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createMinutes(data: {
    meetingId: string;
    title: string;
    content: string;
    actionItems?: any[];
    decisions?: any[];
    attendees: string[];
    createdBy: string;
  }) {
    const minutes = await this.prisma.meetingMinutes.create({
      data: {
        ...data,
        actionItems: data.actionItems || [],
        decisions: data.decisions || [],
      },
      include: {
        meeting: {
          include: {
            host: true,
            team: true,
          },
        },
        creator: true,
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'meeting_minutes',
      entityId: minutes.id,
      userId: data.createdBy,
      details: { meetingId: data.meetingId, title: data.title },
    });

    return minutes;
  }

  async getMinutes(meetingId?: string) {
    return this.prisma.meetingMinutes.findMany({
      where: meetingId ? { meetingId } : undefined,
      include: {
        meeting: {
          include: {
            host: true,
            team: true,
          },
        },
        creator: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMinute(id: string) {
    const minute = await this.prisma.meetingMinutes.findUnique({
      where: { id },
      include: {
        meeting: {
          include: {
            host: true,
            team: true,
            participants: true,
          },
        },
        creator: true,
      },
    });

    if (!minute) {
      throw new NotFoundException('Meeting minutes not found');
    }

    return minute;
  }

  async updateMinutes(
    id: string,
    data: {
      title?: string;
      content?: string;
      actionItems?: any[];
      decisions?: any[];
      attendees?: string[];
    },
    userId: string,
  ) {
    const exists = await this.prisma.meetingMinutes.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Meeting minutes not found');
    }

    const minutes = await this.prisma.meetingMinutes.update({
      where: { id },
      data,
      include: {
        meeting: true,
        creator: true,
      },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'meeting_minutes',
      entityId: id,
      userId,
      details: data,
    });

    return minutes;
  }

  async deleteMinutes(id: string, userId: string) {
    const minutes = await this.prisma.meetingMinutes.findUnique({
      where: { id },
      include: { meeting: true },
    });

    if (!minutes) {
      throw new NotFoundException('Meeting minutes not found');
    }

    await this.prisma.meetingMinutes.delete({ where: { id } });

    await this.auditService.log({
      action: 'delete',
      entity: 'meeting_minutes',
      entityId: id,
      userId,
      details: { meetingId: minutes.meetingId },
    });

    return { success: true };
  }
}
