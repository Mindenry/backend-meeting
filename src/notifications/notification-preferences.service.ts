import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create default preferences for a user
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          // Defaults are set in schema
        },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    data: {
      mentionDelivery?: string;
      taskAssignedDelivery?: string;
      meetingStartingDelivery?: string;
      pullRequestReviewDelivery?: string;
      taskUpdateDelivery?: string;
      meetingCreatedDelivery?: string;
      messageDelivery?: string;
      announcementDelivery?: string;
      teamUpdateDelivery?: string;
      digestTime?: string;
      digestTimezone?: string;
      digestIncludeRead?: boolean;
      soundEnabled?: boolean;
      desktopEnabled?: boolean;
      badgeEnabled?: boolean;
    },
  ) {
    // Ensure preferences exist
    await this.getPreferences(userId);

    return this.prisma.notificationPreference.update({
      where: { userId },
      data,
    });
  }

  /**
   * Get delivery mode for a notification type
   */
  async getDeliveryMode(
    userId: string,
    notificationType: string,
  ): Promise<string> {
    const prefs = await this.getPreferences(userId);

    // Map notification types to preference fields
    const typeMap: Record<string, keyof typeof prefs> = {
      mention: 'mentionDelivery',
      task_assigned: 'taskAssignedDelivery',
      meeting_starting: 'meetingStartingDelivery',
      pullrequest_review: 'pullRequestReviewDelivery',
      pullrequest_created: 'pullRequestReviewDelivery',
      task_updated: 'taskUpdateDelivery',
      task_completed: 'taskUpdateDelivery',
      meeting_created: 'meetingCreatedDelivery',
      message_mention: 'messageDelivery',
      message: 'messageDelivery',
      announcement: 'announcementDelivery',
      team_member_added: 'teamUpdateDelivery',
      team_updated: 'teamUpdateDelivery',
    };

    const field = typeMap[notificationType] || 'messageDelivery';
    return (prefs[field] as string) || 'realtime';
  }

  /**
   * Check if notification should be sent immediately
   */
  async shouldSendRealtime(
    userId: string,
    notificationType: string,
  ): Promise<boolean> {
    const deliveryMode = await this.getDeliveryMode(userId, notificationType);
    return deliveryMode === 'realtime';
  }
}
