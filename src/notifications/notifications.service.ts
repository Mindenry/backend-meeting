import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data,
    });
  }

  async createForUsers(
    userIds: string[],
    data: {
      type: string;
      title: string;
      message: string;
      link?: string;
    },
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      ...data,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: unreadOnly ? false : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  // Helper methods for common notification types
  async notifyMention(userId: string, mentionedBy: string, channelId: string, messageId: string) {
    const mentionedByUser = await this.prisma.user.findUnique({
      where: { id: mentionedBy },
      select: { name: true },
    });

    return this.create({
      userId,
      type: 'mention',
      title: `${mentionedByUser?.name || 'Someone'} mentioned you`,
      message: `You were mentioned in a message`,
      link: `/chat?channel=${channelId}&message=${messageId}`,
    });
  }

  async notifyTaskAssignment(userId: string, taskId: string, taskTitle: string, assignedBy: string) {
    const assignedByUser = await this.prisma.user.findUnique({
      where: { id: assignedBy },
      select: { name: true },
    });

    return this.create({
      userId,
      type: 'task_assigned',
      title: 'New task assigned',
      message: `${assignedByUser?.name || 'Someone'} assigned you: ${taskTitle}`,
      link: `/tasks?task=${taskId}`,
    });
  }

  async notifyMeetingStarting(userId: string, meetingId: string, meetingTitle: string, startTime: Date) {
    return this.create({
      userId,
      type: 'meeting_starting',
      title: 'Meeting starting soon',
      message: `Meeting "${meetingTitle}" starts in 5 minutes`,
      link: `/meeting-lobby/${meetingId}`,
    });
  }
}

