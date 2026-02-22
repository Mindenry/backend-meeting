import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';

@Injectable()
export class NotificationDigestService {
  private readonly logger = new Logger(NotificationDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Calculate notification priority based on type
   */
  private getNotificationPriority(type: string): string {
    // Urgent: requires immediate attention
    if (['mention', 'task_assigned', 'meeting_starting', 'pullrequest_review'].includes(type)) {
      return 'urgent';
    }
    // High: important but not urgent
    if (['task_updated', 'meeting_created', 'pullrequest_created'].includes(type)) {
      return 'high';
    }
    // Normal: regular updates
    if (['message', 'message_mention'].includes(type)) {
      return 'normal';
    }
    // Low: informational
    return 'low';
  }

  /**
   * Group notifications by type and related entity
   */
  private groupNotifications(notifications: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const notif of notifications) {
      // Create group key based on type and related entity
      const groupKey = `${notif.type}_${notif.relatedType || 'none'}_${notif.relatedId || 'none'}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(notif);
    }

    return groups;
  }

  /**
   * Create hourly digest for a user
   */
  async createHourlyDigest(userId: string) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const preferences = await this.preferencesService.getPreferences(userId);

    // Get notifications from last hour that should be in digest
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        createdAt: {
          gte: oneHourAgo,
          lt: now,
        },
        read: preferences.digestIncludeRead ? undefined : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (notifications.length === 0) {
      return null;
    }

    // Filter notifications that should be in digest (not realtime)
    const digestNotifications: typeof notifications = [];
    for (const notif of notifications) {
      const deliveryMode = await this.preferencesService.getDeliveryMode(userId, notif.type);
      if (deliveryMode === 'digest_hourly') {
        digestNotifications.push(notif);
      }
    }

    if (digestNotifications.length === 0) {
      return null;
    }

    // Group notifications
    const groups = this.groupNotifications(digestNotifications);

    // Calculate summary
    const byType: Record<string, number> = {};
    const highlights: any[] = [];
    const notificationIds: string[] = [];

    for (const [groupKey, groupNotifs] of groups) {
      const type = groupNotifs[0].type;
      byType[type] = (byType[type] || 0) + groupNotifs.length;

      // Add first notification as highlight
      if (highlights.length < 5) {
        highlights.push({
          id: groupNotifs[0].id,
          type: groupNotifs[0].type,
          title: groupNotifs[0].title,
          message: groupNotifs[0].message,
          count: groupNotifs.length,
        });
      }

      notificationIds.push(...groupNotifs.map((n) => n.id));
    }

    // Create digest entry
    const digest = await this.prisma.notificationDigest.create({
      data: {
        userId,
        digestType: 'hourly',
        periodStart: oneHourAgo,
        periodEnd: now,
        totalCount: digestNotifications.length,
        unreadCount: digestNotifications.filter((n) => !n.read).length,
        byType: byType as any,
        highlights: highlights as any,
        notificationIds,
      },
    });

    // Send digest notification (skip preferences check to avoid circular dependency)
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'digest',
        title: `Hourly Digest: ${digestNotifications.length} notifications`,
        message: `You have ${digest.unreadCount} unread notifications from the past hour`,
        link: `/notifications?digest=${digest.id}`,
        relatedId: digest.id,
        relatedType: 'digest',
        priority: 'normal',
      },
    });

    this.logger.log(`Created hourly digest for user ${userId}: ${digestNotifications.length} notifications`);

    return digest;
  }

  /**
   * Create daily digest for a user
   */
  async createDailyDigest(userId: string) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const preferences = await this.preferencesService.getPreferences(userId);

    // Get notifications from last 24 hours that should be in digest
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        createdAt: {
          gte: oneDayAgo,
          lt: now,
        },
        read: preferences.digestIncludeRead ? undefined : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (notifications.length === 0) {
      return null;
    }

    // Filter notifications that should be in digest
    const digestNotifications: typeof notifications = [];
    for (const notif of notifications) {
      const deliveryMode = await this.preferencesService.getDeliveryMode(userId, notif.type);
      if (['digest_daily', 'digest_hourly'].includes(deliveryMode)) {
        digestNotifications.push(notif);
      }
    }

    if (digestNotifications.length === 0) {
      return null;
    }

    // Group notifications
    const groups = this.groupNotifications(digestNotifications);

    // Calculate summary
    const byType: Record<string, number> = {};
    const highlights: any[] = [];
    const notificationIds: string[] = [];

    for (const [groupKey, groupNotifs] of groups) {
      const type = groupNotifs[0].type;
      byType[type] = (byType[type] || 0) + groupNotifs.length;

      // Add first notification as highlight
      if (highlights.length < 10) {
        highlights.push({
          id: groupNotifs[0].id,
          type: groupNotifs[0].type,
          title: groupNotifs[0].title,
          message: groupNotifs[0].message,
          count: groupNotifs.length,
        });
      }

      notificationIds.push(...groupNotifs.map((n) => n.id));
    }

    // Create digest entry
    const digest = await this.prisma.notificationDigest.create({
      data: {
        userId,
        digestType: 'daily',
        periodStart: oneDayAgo,
        periodEnd: now,
        totalCount: digestNotifications.length,
        unreadCount: digestNotifications.filter((n) => !n.read).length,
        byType: byType as any,
        highlights: highlights as any,
        notificationIds,
      },
    });

    // Send digest notification (skip preferences check to avoid circular dependency)
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'digest',
        title: `Daily Digest: ${digestNotifications.length} notifications`,
        message: `You have ${digest.unreadCount} unread notifications from today`,
        link: `/notifications?digest=${digest.id}`,
        relatedId: digest.id,
        relatedType: 'digest',
        priority: 'normal',
      },
    });

    this.logger.log(`Created daily digest for user ${userId}: ${digestNotifications.length} notifications`);

    return digest;
  }

  /**
   * Send daily digests (cron job - runs every hour to check if it's time)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendDailyDigests() {
    try {
      const now = new Date();
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        include: { notificationPreferences: true },
      });

      for (const user of users) {
        if (!user.notificationPreferences) continue;

        const prefs = user.notificationPreferences;
        const digestTime = prefs.digestTime || '18:00';
        const [hours, minutes] = digestTime.split(':').map(Number);

        // Check if it's time to send digest (within current hour)
        const currentHour = now.getHours();
        if (currentHour === hours) {
          await this.createDailyDigest(user.id);
        }
      }
    } catch (error) {
      this.logger.error(`Error sending daily digests: ${error.message}`, error.stack);
    }
  }

  /**
   * Send hourly digests (cron job - runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendHourlyDigests() {
    try {
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
      });

      for (const user of users) {
        await this.createHourlyDigest(user.id);
      }
    } catch (error) {
      this.logger.error(`Error sending hourly digests: ${error.message}`, error.stack);
    }
  }

  /**
   * Get digests for a user
   */
  async getUserDigests(userId: string, options?: { limit?: number; digestType?: string }) {
    return this.prisma.notificationDigest.findMany({
      where: {
        userId,
        ...(options?.digestType ? { digestType: options.digestType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 10,
    });
  }

  /**
   * Mark digest as read
   */
  async markDigestAsRead(digestId: string, userId: string) {
    return this.prisma.notificationDigest.updateMany({
      where: {
        id: digestId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
