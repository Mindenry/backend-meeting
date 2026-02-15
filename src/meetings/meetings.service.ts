import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  findAll(params?: { status?: string; teamId?: string }) {
    const { status, teamId } = params || {};
    return this.prisma.meeting.findMany({
      where: {
        status: status || undefined,
        teamId: teamId || undefined,
      },
      include: {
        team: true,
        host: true,
        tasks: true,
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
            user: true,
          },
        },
        recordings: true,
        minutes: true,
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    waitingRoom?: boolean;
    allowScreenShare?: boolean;
    status?: string;
    teamId?: string | null;
    hostId: string;
  }) {
    const meeting = await this.prisma.meeting.create({
      data: {
        ...data,
      },
      include: {
        team: true,
        host: true,
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
    });
  }
}


