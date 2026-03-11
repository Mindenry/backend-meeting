import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createReminder(data: {
    title: string;
    description?: string;
    type: string;
    relatedId?: string;
    relatedType?: string;
    remindAt: Date;
    userIds: string[];
    createdBy: string;
  }) {
    const reminder = await this.prisma.reminder.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        relatedId: data.relatedId,
        relatedType: data.relatedType,
        remindAt: data.remindAt,
        createdBy: data.createdBy,
        recipients: {
          create: data.userIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        creator: true,
        recipients: {
          include: {
            user: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'reminder',
      entityId: reminder.id,
      userId: data.createdBy,
      details: {
        title: data.title,
        type: data.type,
        remindAt: data.remindAt,
        recipientCount: data.userIds.length,
      },
    });

    return reminder;
  }

  async getReminders(filters: {
    userId?: string;
    type?: string;
    relatedId?: string;
    isSent?: boolean;
  }) {
    const where: any = {};

    if (filters.userId) {
      where.recipients = {
        some: {
          userId: filters.userId,
        },
      };
    }

    if (filters.type) where.type = filters.type;
    if (filters.relatedId) where.relatedId = filters.relatedId;
    if (filters.isSent !== undefined) where.isSent = filters.isSent;

    return this.prisma.reminder.findMany({
      where,
      include: {
        creator: true,
        recipients: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { remindAt: 'asc' },
    });
  }

  async getReminder(id: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
      include: {
        creator: true,
        recipients: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  async updateReminder(
    id: string,
    data: {
      title?: string;
      description?: string;
      remindAt?: Date;
      isSent?: boolean;
    },
    userId: string,
  ) {
    const exists = await this.prisma.reminder.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Reminder not found');
    }

    if (exists.createdBy !== userId) {
      throw new NotFoundException('You can only update reminders you created');
    }

    const reminder = await this.prisma.reminder.update({
      where: { id },
      data,
      include: {
        creator: true,
        recipients: {
          include: {
            user: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'reminder',
      entityId: id,
      userId,
      details: data,
    });

    return reminder;
  }

  async markAsRead(reminderId: string, userId: string) {
    const recipient = await this.prisma.reminderRecipient.findUnique({
      where: {
        reminderId_userId: { reminderId, userId },
      },
    });

    if (!recipient) {
      throw new NotFoundException('Reminder recipient not found');
    }

    if (recipient.isRead) {
      return recipient;
    }

    return this.prisma.reminderRecipient.update({
      where: {
        reminderId_userId: { reminderId, userId },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async deleteReminder(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    if (reminder.createdBy !== userId) {
      throw new NotFoundException('You can only delete reminders you created');
    }

    await this.prisma.reminder.delete({ where: { id } });

    await this.auditService.log({
      action: 'delete',
      entity: 'reminder',
      entityId: id,
      userId,
      details: { title: reminder.title },
    });

    return { success: true };
  }

  async getPendingReminders() {
    const now = new Date();
    return this.prisma.reminder.findMany({
      where: {
        remindAt: {
          lte: now,
        },
        isSent: false,
      },
      include: {
        creator: true,
        recipients: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async markAsSent(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: { isSent: true },
    });
  }
}
