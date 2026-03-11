import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationPreferencesService } from './notification-preferences.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    @Optional()
    private readonly notificationsGateway?: NotificationsGateway,
    @Inject(forwardRef(() => NotificationPreferencesService))
    @Optional()
    private readonly preferencesService?: NotificationPreferencesService,
  ) {}

  /**
   * Calculate priority based on notification type
   */
  private getPriority(type: string): string {
    if (
      [
        'mention',
        'task_assigned',
        'meeting_starting',
        'pullrequest_review',
      ].includes(type)
    ) {
      return 'urgent';
    }
    if (
      ['task_updated', 'meeting_created', 'pullrequest_created'].includes(type)
    ) {
      return 'high';
    }
    if (['message', 'message_mention'].includes(type)) {
      return 'normal';
    }
    return 'low';
  }

  /**
   * Generate grouped ID for related notifications
   */
  private generateGroupedId(
    type: string,
    relatedType?: string,
    relatedId?: string,
  ): string | null {
    if (relatedType && relatedId) {
      return `${type}_${relatedType}_${relatedId}`;
    }
    return null;
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    link?: string;
    priority?: string;
  }) {
    // Calculate priority if not provided
    const priority = data.priority || this.getPriority(data.type);

    // Generate grouped ID for smart grouping
    const groupedId = this.generateGroupedId(
      data.type,
      data.relatedType,
      data.relatedId,
    );

    const notification = await this.prisma.notification.create({
      data: {
        ...data,
        priority,
        groupedId,
      },
      include: { user: true },
    });

    // Check if should send realtime based on preferences
    let shouldSendRealtime = true;
    if (this.preferencesService) {
      shouldSendRealtime = await this.preferencesService.shouldSendRealtime(
        data.userId,
        data.type,
      );
    }

    // Send real-time notification via WebSocket only if preferences allow
    if (shouldSendRealtime && this.notificationsGateway) {
      await this.notificationsGateway.sendNotificationToUser(
        data.userId,
        notification,
      );
    }

    return notification;
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

    const result = await this.prisma.notification.createMany({
      data: notifications,
    });

    // Send real-time notifications via WebSocket
    if (this.notificationsGateway) {
      const notificationData = {
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        read: false,
        createdAt: new Date(),
      };
      await this.notificationsGateway.sendNotificationToUsers(
        userIds,
        notificationData,
      );
    }

    return result;
  }

  async findAll(
    userId: string,
    unreadOnly = false,
    options?: { priority?: string; grouped?: boolean },
  ) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
        ...(options?.priority ? { priority: options.priority } : {}),
      },
      orderBy: [
        { priority: 'desc' }, // Urgent first
        { createdAt: 'desc' }, // Then by time
      ],
      include: { user: true },
    });

    // Group notifications if requested
    if (options?.grouped) {
      return this.groupNotifications(notifications);
    }

    return notifications;
  }

  /**
   * Group notifications by groupedId
   */
  private groupNotifications(notifications: any[]): any[] {
    const groups = new Map<string, any[]>();
    const ungrouped: any[] = [];

    for (const notif of notifications) {
      if (notif.groupedId) {
        if (!groups.has(notif.groupedId)) {
          groups.set(notif.groupedId, []);
        }
        groups.get(notif.groupedId)!.push(notif);
      } else {
        ungrouped.push(notif);
      }
    }

    // Convert groups to grouped format
    const grouped: any[] = [];
    for (const [groupedId, groupNotifs] of groups) {
      if (groupNotifs.length > 1) {
        // Multiple notifications in group - create summary
        const first = groupNotifs[0];
        grouped.push({
          id: `group_${groupedId}`,
          type: 'grouped',
          title: `${groupNotifs.length} ${first.type.replaceAll('_', ' ')}`,
          message: `You have ${groupNotifs.length} related notifications`,
          read: groupNotifs.every((n) => n.read),
          priority: first.priority,
          createdAt: first.createdAt,
          groupedId,
          notifications: groupNotifs,
          count: groupNotifs.length,
        });
      } else {
        // Single notification - add as ungrouped
        ungrouped.push(groupNotifs[0]);
      }
    }

    // Sort: unread first, then by priority and time
    const sorted = [...grouped, ...ungrouped].sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const aPriority =
        priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority =
        priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
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

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    // Update unread count via WebSocket
    if (this.notificationsGateway) {
      const unreadCount = await this.getUnreadCount(userId);
      await this.notificationsGateway.sendNotificationToUser(userId, {
        type: 'unread-count-update',
        count: unreadCount,
      });
    }

    return updated;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    // Update unread count via WebSocket
    if (this.notificationsGateway) {
      const unreadCount = await this.getUnreadCount(userId);
      await this.notificationsGateway.sendNotificationToUser(userId, {
        type: 'unread-count-update',
        count: unreadCount,
      });
    }

    return result;
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

    const deleted = await this.prisma.notification.delete({ where: { id } });

    // Update unread count via WebSocket after deletion
    if (this.notificationsGateway) {
      const unreadCount = await this.getUnreadCount(userId);
      await this.notificationsGateway.sendNotificationToUser(userId, {
        type: 'unread-count-update',
        count: unreadCount,
      });
    }

    return deleted;
  }

  async delete(notificationId: string, userId: string) {
    return this.remove(notificationId, userId);
  }

  // Helper methods for common notification types
  async notifyMention(
    userId: string,
    mentionedBy: string,
    channelId: string,
    messageId: string,
  ) {
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

  async notifyTaskAssignment(
    userId: string,
    taskId: string,
    taskTitle: string,
    assignedBy: string,
  ) {
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

  async notifyMeetingStarting(
    userId: string,
    meetingId: string,
    meetingTitle: string,
    startTime: Date,
  ) {
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

  /**
   * Notify user about a new direct message (DM)
   */
  async notifyDirectMessage(
    receiverId: string,
    senderId: string,
    text: string,
    directMessageId: string,
  ) {
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });

    const preview =
      (text || '').length > 120
        ? `${text.slice(0, 120)}...`
        : text || 'New message';
    // Conversation key (so multiple DMs from the same conversation stack into one notification)
    const conversationId = [receiverId, senderId].sort().join(':');

    // Base payload for DM notification
    const baseData = {
      type: 'message',
      title: `${sender?.name || 'Someone'} sent you a message`,
      message: preview,
      link: `/chat`, // Chat page will handle selecting the DM conversation
      relatedId: conversationId,
      relatedType: 'direct_message_conversation',
    };

    // Try to find an existing unread notification for this conversation
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: receiverId,
        type: baseData.type,
        relatedType: baseData.relatedType,
        relatedId: baseData.relatedId,
        read: false,
      },
    });

    if (existing) {
      // Update existing notification (stack), keep it as a single unread entry
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          message: baseData.message,
          title: baseData.title,
          link: baseData.link,
          // groupedId will be recalculated on next read if needed; we keep it as is
        },
      });
      return updated;
    }

    // No existing unread notification for this conversation → create a new one
    return this.create({
      userId: receiverId,
      ...baseData,
      // Store last DM id as relatedId in case needed elsewhere
      relatedId: conversationId,
      relatedType: 'direct_message_conversation',
    });
  }
}
