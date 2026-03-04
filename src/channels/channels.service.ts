import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ChannelsService {
    private readonly logger = new Logger(ChannelsService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => EventsGateway))
        private readonly eventsGateway: EventsGateway,
    ) { }

    findAll(params?: { teamId?: string; includeMeeting?: boolean }) {
        const { teamId, includeMeeting = false } = params || {};
        return this.prisma.channel.findMany({
            where: {
                teamId: teamId || undefined,
                ...(includeMeeting
                    ? {}
                    : {
                        NOT: {
                            OR: [
                                { type: 'meeting' },
                                { name: { startsWith: 'meeting-' } },
                            ],
                        },
                    }),
            },
            include: {
                team: true,
                _count: {
                    select: { messages: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
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

    async create(data: { name: string; type?: string; description?: string; teamId: string }) {
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

    async update(id: string, data: { name?: string; type?: string; description?: string }) {
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
                OR: [
                    { type: 'meeting' },
                    { name: { startsWith: 'meeting-' } },
                ],
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
            this.logger.log(`Cleaned ${deleted.count} meeting chat messages older than ${retentionDays} days`);
        }
    }
}
