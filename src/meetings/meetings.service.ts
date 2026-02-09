import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
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
    return meeting;
  }

  async remove(id: string) {
    const exists = await this.prisma.meeting.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meeting not found');
    await this.prisma.meeting.delete({ where: { id } });
    this.eventsGateway.emitMeetingDeleted(id);
    return { success: true };
  }
}


