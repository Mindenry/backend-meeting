import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { randomBytes } from 'crypto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
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
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
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
    return meeting;
  }

  async remove(id: string) {
    const exists = await this.prisma.meeting.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meeting not found');
    await this.prisma.meeting.delete({ where: { id } });
    this.eventsGateway.emitMeetingDeleted(id);
    return { success: true };
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

  async updateSummary(id: string, summary: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: { summary },
    });
  }
}


