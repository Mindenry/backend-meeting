import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { CacheHelperService } from '../common/cache/cache-helper.service';
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth/password';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
    private readonly cacheHelper: CacheHelperService,
  ) {}

  private readonly logger = new Logger(MeetingsService.name);

  generateMeetingCode(): string {
    // Generate a 9-digit meeting code
    return randomBytes(4).toString('hex').substring(0, 9).toUpperCase();
  }

  findAll(params?: { status?: string; teamId?: string; hostId?: string }) {
    const { status, teamId, hostId } = params || {};
    return this.prisma.meeting.findMany({
      where: {
        status: status || undefined,
        teamId: teamId || undefined,
        hostId: hostId || undefined,
      },
      include: {
        team: true,
        host: true,
        tasks: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        team: true,
        host: true,
        tasks: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        recordings: true,
        minutes: true,
      },
    });
  }

  findByCode(meetingCode: string) {
    return this.prisma.meeting.findUnique({
      where: { meetingCode },
      include: {
        team: true,
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async generateLivekitToken(
    meetingId: string,
    userId: string,
    userName: string,
  ) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'LiveKit API key or secret is not configured in environment variables',
      );
    }

    // Use "quick-huddle" or the actual meeting ID as the room name
    const roomName = meetingId || 'quick-huddle';

    // Fetch user to get avatar
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName || 'Participant',
      metadata: user?.avatar || '',
    });

    at.addGrant({ roomJoin: true, room: roomName });
    const token = await at.toJwt();

    return { token, room: roomName };
  }

  async create(data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    password?: string;
    waitingRoom?: boolean;
    allowScreenShare?: boolean;
    status?: string;
    teamId?: string | null;
    hostId: string;
    isInstant?: boolean;
    isRecurring?: boolean;
    recurringPattern?: string;
    recurringDays?: number[];
    recurringEndDate?: Date;
  }) {
    let meetingCode = this.generateMeetingCode();
    // Ensure unique meeting code
    while (await this.prisma.meeting.findUnique({ where: { meetingCode } })) {
      meetingCode = this.generateMeetingCode();
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        ...data,
        password: data.password ? hashPassword(data.password) : undefined,
        meetingCode,
        status: data.status || (data.isInstant ? 'live' : 'scheduled'),
        actualStartTime: data.isInstant ? new Date() : undefined,
        isRecurring: data.isRecurring || false,
        recurringPattern: data.recurringPattern,
        recurringDays: data.recurringDays || [],
        recurringEndDate: data.recurringEndDate,
      },
      include: {
        team: true,
        host: true,
        participants: true,
      },
    });

    // If recurring, generate instances
    if (data.isRecurring && data.recurringPattern) {
      await this.generateRecurringInstances(meeting.id);
    }

    this.eventsGateway.emitMeetingCreated(meeting);

    // Audit log
    await this.auditService.log({
      action: 'create',
      entity: 'meeting',
      entityId: meeting.id,
      userId: meeting.hostId,
      userName: meeting.host.name,
      details: {
        title: meeting.title,
        teamId: meeting.teamId,
        startTime: meeting.startTime,
      },
    });

    // Create notifications for team members if meeting is team-based
    if (meeting.teamId) {
      try {
        const teamMembers = await this.prisma.teamMember.findMany({
          where: { teamId: meeting.teamId },
          include: { user: true },
        });

        const notifications = teamMembers
          .filter((m) => m.userId !== meeting.hostId)
          .map((member) =>
            this.notificationsService
              .create({
                userId: member.userId,
                type: 'meeting_created',
                title: 'New meeting scheduled',
                message: `${meeting.host.name} scheduled: ${meeting.title}`,
                relatedId: meeting.id,
                relatedType: 'meeting',
              })
              .catch((err) => {
                console.error(
                  `Failed to create notification for user ${member.userId}:`,
                  err,
                );
              }),
          );

        await Promise.allSettled(notifications);
      } catch (err) {
        console.error('Failed to create meeting notifications:', err);
      }
    }

    return meeting;
  }

  async startMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const updatedMeeting = await this.prisma.meeting.update({
      where: { id },
      data: {
        status: 'live',
        actualStartTime: new Date(),
      },
      include: {
        team: true,
        host: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Trigger workflow for meeting_started
    try {
      await this.workflowsService.triggerWorkflow('meeting_started', {
        id: updatedMeeting.id,
        title: updatedMeeting.title,
        description: updatedMeeting.description,
        hostId: updatedMeeting.hostId,
        teamId: updatedMeeting.teamId,
        startTime: updatedMeeting.startTime,
        actualStartTime: updatedMeeting.actualStartTime,
        participants: updatedMeeting.participants.map((p) => ({
          userId: p.userId,
          name: p.user.name,
          email: p.user.email,
        })),
      });
    } catch (err) {
      console.error('Failed to trigger workflow:', err);
    }

    // Invalidate cache for host and participants
    await this.cacheHelper.invalidateUserDashboard(updatedMeeting.hostId);
    if (updatedMeeting.teamId) {
      await this.cacheHelper.invalidateTeamDashboards(updatedMeeting.teamId);
    }
    for (const participant of updatedMeeting.participants) {
      await this.cacheHelper.invalidateUserDashboard(participant.userId);
    }

    return updatedMeeting;
  }

  async endMeeting(id: string, summary?: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const updatedMeeting = await this.prisma.meeting.update({
      where: { id },
      data: {
        status: 'ended',
        actualEndTime: new Date(),
        summary,
      },
      include: {
        team: true,
        host: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        minutes: true,
        recordings: true,
      },
    });

    // Trigger workflow for meeting_ended
    try {
      await this.workflowsService.triggerWorkflow('meeting_ended', {
        id: updatedMeeting.id,
        title: updatedMeeting.title,
        description: updatedMeeting.description,
        hostId: updatedMeeting.hostId,
        teamId: updatedMeeting.teamId,
        startTime: updatedMeeting.startTime,
        actualStartTime: updatedMeeting.actualStartTime,
        actualEndTime: updatedMeeting.actualEndTime,
        summary: updatedMeeting.summary,
        participants: updatedMeeting.participants.map((p) => ({
          userId: p.userId,
          name: p.user.name,
          email: p.user.email,
        })),
        hasMinutes: updatedMeeting.minutes.length > 0,
        hasRecordings: updatedMeeting.recordings.length > 0,
      });
    } catch (err) {
      console.error('Failed to trigger workflow:', err);
    }

    // Invalidate cache for host and participants
    await this.cacheHelper.invalidateUserDashboard(updatedMeeting.hostId);
    if (updatedMeeting.teamId) {
      await this.cacheHelper.invalidateTeamDashboards(updatedMeeting.teamId);
    }
    for (const participant of updatedMeeting.participants) {
      await this.cacheHelper.invalidateUserDashboard(participant.userId);
    }

    return updatedMeeting;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      waitingRoom: boolean;
      allowScreenShare: boolean;
      status: string;
      teamId?: string | null;
    }>,
  ) {
    const exists = await this.prisma.meeting.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meeting not found');
    const meeting = await this.prisma.meeting.update({
      where: { id },
      data,
      include: {
        team: true,
        host: true,
      },
    });
    this.eventsGateway.emitMeetingUpdated(meeting);

    // Audit log
    await this.auditService.log({
      action: 'update',
      entity: 'meeting',
      entityId: meeting.id,
      userId: meeting.hostId,
      userName: meeting.host.name,
      details: {
        changes: Object.keys(data),
        title: meeting.title,
        status: meeting.status,
      },
    });

    return meeting;
  }

  async remove(id: string) {
    const exists = await this.prisma.meeting.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meeting not found');

    // Audit log before delete
    await this.auditService.log({
      action: 'delete',
      entity: 'meeting',
      entityId: id,
      userId: exists.hostId,
      details: { title: exists.title },
    });

    await this.prisma.meeting.delete({ where: { id } });
    this.eventsGateway.emitMeetingDeleted(id);
    return { success: true };
  }

  // Participants
  async joinMeeting(
    meetingId: string,
    userId: string,
    role: string = 'participant',
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const participant = await this.prisma.meetingParticipant.upsert({
      where: {
        meetingId_userId: { meetingId, userId },
      },
      update: {
        joinedAt: new Date(),
        leftAt: null,
        role,
      },
      create: {
        meetingId,
        userId,
        role,
        joinedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'join',
      entity: 'meeting_participant',
      entityId: participant.id,
      userId,
      details: { meetingId, role },
    });

    return participant;
  }

  async leaveMeeting(meetingId: string, userId: string) {
    const participant = await this.prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: { meetingId, userId },
      },
    });

    if (!participant) {
      return { success: true };
    }

    const leftAt = new Date();
    const duration = Math.floor(
      (leftAt.getTime() - participant.joinedAt.getTime()) / 1000,
    );

    await this.prisma.meetingParticipant.update({
      where: {
        meetingId_userId: { meetingId, userId },
      },
      data: {
        leftAt,
        duration,
      },
    });

    await this.auditService.log({
      action: 'leave',
      entity: 'meeting_participant',
      entityId: participant.id,
      userId,
      details: { meetingId, duration },
    });

    return { success: true };
  }

  async getParticipants(meetingId: string) {
    return this.prisma.meetingParticipant.findMany({
      where: { meetingId },
      include: {
        user: true,
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async lockMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: { isLocked: true },
    });
  }

  async unlockMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: { isLocked: false },
    });
  }

  /**
   * Generate recurring meeting instances from a template
   */
  async generateRecurringInstances(templateId: string, upToDate?: Date) {
    const template = await this.prisma.meeting.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isRecurring || !template.recurringPattern) {
      throw new NotFoundException('Recurring meeting template not found');
    }

    const endDate =
      upToDate ||
      template.recurringEndDate ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default: 1 year ahead
    const instances: any[] = [];
    let currentDate = new Date(template.startTime);

    while (currentDate <= endDate) {
      // Check if instance already exists
      const existing = await this.prisma.meeting.findFirst({
        where: {
          parentMeetingId: templateId,
          startTime: currentDate,
        },
      });

      if (!existing) {
        const duration = template.endTime
          ? template.endTime.getTime() - template.startTime.getTime()
          : 60 * 60 * 1000; // Default 1 hour

        const instanceEndTime = new Date(currentDate.getTime() + duration);
        let meetingCode = this.generateMeetingCode();
        while (
          await this.prisma.meeting.findUnique({ where: { meetingCode } })
        ) {
          meetingCode = this.generateMeetingCode();
        }

        const instance = await this.prisma.meeting.create({
          data: {
            title: template.title,
            description: template.description,
            startTime: currentDate,
            endTime: instanceEndTime,
            meetingCode,
            password: template.password,
            waitingRoom: template.waitingRoom,
            allowScreenShare: template.allowScreenShare,
            status: 'scheduled',
            teamId: template.teamId,
            hostId: template.hostId,
            isRecurring: false,
            parentMeetingId: templateId,
            recurringTemplateId: templateId,
          },
        });

        instances.push(instance);
        this.eventsGateway.emitMeetingCreated(instance);
      }

      // Calculate next occurrence
      currentDate = this.getNextRecurrenceDate(
        currentDate,
        template.recurringPattern,
        template.recurringDays || [],
      );
    }

    this.logger.log(
      `Generated ${instances.length} recurring meeting instances for template ${templateId}`,
    );
    return instances;
  }

  /**
   * Get the next recurrence date based on pattern
   */
  private getNextRecurrenceDate(
    currentDate: Date,
    pattern: string,
    days: number[],
  ): Date {
    const next = new Date(currentDate);

    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;

      case 'weekly':
        if (days.length > 0) {
          // Find next day in the days array
          const currentDay = next.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const sortedDays = [...days].sort((a, b) => a - b);
          const nextDay =
            sortedDays.find((d) => d > currentDay) || sortedDays[0];

          if (nextDay > currentDay) {
            next.setDate(next.getDate() + (nextDay - currentDay));
          } else {
            // Next week
            next.setDate(next.getDate() + (7 - currentDay + nextDay));
          }
        } else {
          next.setDate(next.getDate() + 7);
        }
        break;

      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;

      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Regenerate recurring instances (useful for extending or updating)
   */
  async regenerateRecurringInstances(templateId: string) {
    // Delete existing future instances
    const now = new Date();
    await this.prisma.meeting.deleteMany({
      where: {
        parentMeetingId: templateId,
        startTime: {
          gt: now,
        },
      },
    });

    // Regenerate
    return this.generateRecurringInstances(templateId);
  }
}
