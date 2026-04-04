import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CacheHelperService } from '../common/cache/cache-helper.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly cacheHelper: CacheHelperService,
  ) {}

  async findByUserTeams(userId: string, params?: { includeMeeting?: boolean }) {
    const { includeMeeting = false } = params || {};
    
    // Get all teams the user is a member of
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    
    const teamIds = memberships.map(m => m.teamId);
    
    if (teamIds.length === 0) {
      return [];
    }
    
    return this.prisma.channel.findMany({
      where: {
        teamId: { in: teamIds },
        ...(includeMeeting
          ? {}
          : {
              NOT: {
                OR: [{ type: 'meeting' }, { name: { startsWith: 'meeting-' } }],
              },
            }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findAll(params?: { teamId?: string; includeMeeting?: boolean }) {
    const { teamId, includeMeeting = false } = params || {};
    
    const cacheKey = `channels:${teamId || 'all'}:${includeMeeting}`;
    
    return this.cacheHelper.getOrSet(
      cacheKey,
      () =>
        this.prisma.channel.findMany({
          where: {
            teamId: teamId || undefined,
            ...(includeMeeting
              ? {}
              : {
                  NOT: {
                    OR: [{ type: 'meeting' }, { name: { startsWith: 'meeting-' } }],
                  },
                }),
          },
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: { messages: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
      30, // 30 seconds TTL
    );
  }

  async findOne(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        team: true,
        messages: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: true,
            replyTo: true,
          },
        },
      },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    channel.messages = channel.messages.reverse();
    return channel;
  }

  async create(data: {
    name: string;
    type?: string;
    description?: string;
    teamId: string;
  }) {
    const channel = await this.prisma.channel.create({
      data: {
        name: data.name,
        type: data.type || 'general',
        description: data.description,
        teamId: data.teamId,
      },
      include: { team: true },
    });
    this.eventsGateway.emitChannelCreated(channel);
    return channel;
  }

  async update(
    id: string,
    data: { name?: string; type?: string; description?: string },
  ) {
    const exists = await this.prisma.channel.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Channel not found');
    const channel = await this.prisma.channel.update({
      where: { id },
      data,
      include: { team: true },
    });
    this.eventsGateway.emitChannelUpdated(channel);
    return channel;
  }

  async remove(id: string) {
    const exists = await this.prisma.channel.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Channel not found');
    await this.prisma.channel.delete({ where: { id } });
    this.eventsGateway.emitChannelDeleted(id);
    return { success: true };
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupMeetingChatHistory() {
    const retentionDays = Number(process.env.MEETING_CHAT_RETENTION_DAYS || 14);
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const meetingChannels = await this.prisma.channel.findMany({
      where: {
        OR: [{ type: 'meeting' }, { name: { startsWith: 'meeting-' } }],
      },
      select: { id: true },
    });

    if (meetingChannels.length === 0) return;

    const channelIds = meetingChannels.map((c) => c.id);
    const deleted = await this.prisma.message.deleteMany({
      where: {
        channelId: { in: channelIds },
        createdAt: { lt: cutoff },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(
        `Cleaned ${deleted.count} meeting chat messages older than ${retentionDays} days`,
      );
    }
  }
}
