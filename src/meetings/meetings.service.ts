import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
<<<<<<< HEAD
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit.service';
=======
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth/password';
>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

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
<<<<<<< HEAD
            user: true,
          },
        },
        recordings: true,
        minutes: true,
=======
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
>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700
      },
    });
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
      },
      include: {
        team: true,
        host: true,
        participants: true,
      },
    });
    this.eventsGateway.emitMeetingCreated(meeting);
    
    // Audit log
    await this.auditService.log({
      action: 'create',
      entity: 'meeting',
      entityId: meeting.id,
      userId: meeting.hostId,
      userName: meeting.host.name,
      details: { title: meeting.title, teamId: meeting.teamId, startTime: meeting.startTime },
    });
    
    // Create notifications for team members if meeting is team-based
    if (meeting.teamId) {
      try {
        const teamMembers = await this.prisma.teamMember.findMany({
          where: { teamId: meeting.teamId },
          include: { user: true },
        });
        
        const notifications = teamMembers
          .filter(m => m.userId !== meeting.hostId)
          .map(member => 
            this.notificationsService.create({
              userId: member.userId,
              type: 'meeting_created',
              title: 'New meeting scheduled',
              message: `${meeting.host.name} scheduled: ${meeting.title}`,
              relatedId: meeting.id,
              relatedType: 'meeting',
            }).catch(err => {
              console.error(`Failed to create notification for user ${member.userId}:`, err);
            })
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

    return this.prisma.meeting.update({
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
  }

  async endMeeting(id: string, summary?: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
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
      },
    });
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

<<<<<<< HEAD
  // Participants
  async joinMeeting(meetingId: string, userId: string, role: string = 'participant') {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
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
=======
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

  async updateSummary(id: string, summary: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: { summary },
>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700
    });
  }
}


