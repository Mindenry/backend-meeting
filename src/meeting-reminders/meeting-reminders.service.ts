import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MeetingRemindersService {
  private readonly logger = new Logger(MeetingRemindersService.name);
  private readonly reminderMinutes = [30, 15, 5]; // Minutes before meeting to send reminders

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Check for upcoming meetings every minute and send reminders
   * This cron job runs every minute: * * * * *
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndSendReminders() {
    try {
      const now = new Date();

      // Find all scheduled meetings that haven't started yet
      const upcomingMeetings = await this.prisma.meeting.findMany({
        where: {
          status: 'scheduled',
          startTime: {
            gt: now, // Only future meetings
          },
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          team: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (upcomingMeetings.length === 0) {
        return;
      }

      this.logger.debug(
        `Checking ${upcomingMeetings.length} upcoming meetings for reminders`,
      );

      for (const meeting of upcomingMeetings) {
        await this.processMeetingReminders(meeting, now);
      }
    } catch (error) {
      this.logger.error(
        `Error checking meeting reminders: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Process reminders for a single meeting
   */
  private async processMeetingReminders(meeting: any, now: Date) {
    const timeUntilMeeting = meeting.startTime.getTime() - now.getTime();
    const minutesUntilMeeting = Math.floor(timeUntilMeeting / (1000 * 60));

    // Check each reminder interval (30, 15, 5 minutes)
    for (const minutesBefore of this.reminderMinutes) {
      // Check if we're within the reminder window (within 1 minute of the target time)
      if (
        minutesUntilMeeting <= minutesBefore &&
        minutesUntilMeeting > minutesBefore - 1
      ) {
        await this.sendReminderForMeeting(meeting, minutesBefore);
      }
    }
  }

  /**
   * Send reminder notifications to all participants for a meeting
   */
  private async sendReminderForMeeting(meeting: any, minutesBefore: number) {
    try {
      // Get all users who should receive the reminder (host + participants + team members)
      const userIds = new Set<string>();
      userIds.add(meeting.hostId);

      // Add all participants
      for (const participant of meeting.participants || []) {
        if (participant.user?.id) {
          userIds.add(participant.user.id);
        }
      }

      // If meeting is associated with a team, add all team members
      if (meeting.team?.members) {
        for (const member of meeting.team.members) {
          if (member.user?.id) {
            userIds.add(member.user.id);
          }
        }
      }

      const usersToNotify = Array.from(userIds);

      if (usersToNotify.length === 0) {
        this.logger.warn(`No users to notify for meeting ${meeting.id}`);
        return;
      }

      // Check which reminders have already been sent
      const sentReminders = await this.prisma.meetingReminder.findMany({
        where: {
          meetingId: meeting.id,
          minutesBefore,
        },
        select: {
          userId: true,
        },
      });

      const sentUserIds = new Set(sentReminders.map((r) => r.userId));
      const usersToNotifyFiltered = usersToNotify.filter(
        (userId) => !sentUserIds.has(userId),
      );

      if (usersToNotifyFiltered.length === 0) {
        this.logger.debug(
          `All reminders already sent for meeting ${meeting.id} at ${minutesBefore} minutes`,
        );
        return;
      }

      // Format the reminder message based on minutes before
      const timeText = this.getTimeText(minutesBefore);
      const startTimeFormatted = new Date(meeting.startTime).toLocaleString(
        'th-TH',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );

      // Send notifications to all users who haven't received this reminder yet
      for (const userId of usersToNotifyFiltered) {
        await this.notificationsService.create({
          userId,
          type: 'meeting_reminder',
          title: `แจ้งเตือนการประชุม${timeText}`,
          message: `การประชุม "${meeting.title}" จะเริ่มในอีก ${minutesBefore} นาที (${startTimeFormatted})`,
          link: `/meeting-lobby/${meeting.id}`,
        });

        // Record that we sent this reminder
        await this.prisma.meetingReminder.create({
          data: {
            meetingId: meeting.id,
            userId,
            minutesBefore,
          },
        });
      }

      this.logger.log(
        `Sent ${minutesBefore}-minute reminders for meeting "${meeting.title}" to ${usersToNotifyFiltered.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending reminders for meeting ${meeting.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get Thai text for time before meeting
   */
  private getTimeText(minutesBefore: number): string {
    switch (minutesBefore) {
      case 30:
        return ' (30 นาที)';
      case 15:
        return ' (15 นาที)';
      case 5:
        return ' (5 นาที)';
      default:
        return '';
    }
  }

  /**
   * Manually trigger reminder check (useful for testing)
   */
  async triggerReminderCheck() {
    this.logger.log('Manually triggering reminder check');
    await this.checkAndSendReminders();
  }
}
