import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data,
      include: { user: true },
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
      read: false,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async findAll(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  // Alias for backward compatibility if needed, or just use findAll
  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    return this.findAll(userId, unreadOnly);
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.delete({ where: { id } });
  }

  async delete(notificationId: string, userId: string) {
    return this.remove(notificationId, userId);
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
      relatedId: messageId,
      relatedType: 'message',
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
      relatedId: taskId,
      relatedType: 'task',
    });
  }

  async notifyMeetingStarting(userId: string, meetingId: string, meetingTitle: string, startTime: Date) {
    return this.create({
      userId,
      type: 'meeting_starting',
      title: 'Meeting starting soon',
      message: `Meeting "${meetingTitle}" starts in 5 minutes`,
      link: `/meeting-lobby/${meetingId}`,
      relatedId: meetingId,
      relatedType: 'meeting',
    });
  }
}
