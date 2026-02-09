import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class MessagesService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => EventsGateway))
        private readonly eventsGateway: EventsGateway,
    ) { }

    async findByChannel(channelId: string, params?: { limit?: number; before?: string }) {
        const { limit = 50, before } = params || {};

        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) throw new NotFoundException('Channel not found');

        return this.prisma.message.findMany({
            where: {
                channelId,
                ...(before ? { createdAt: { lt: new Date(before) } } : {}),
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: true,
                replyTo: {
                    include: { sender: true },
                },
            },
        }).then(messages => messages.reverse());
    }

    async create(data: {
        text: string;
        channelId: string;
        senderId: string;
        replyToId?: string;
    }) {
        const channel = await this.prisma.channel.findUnique({ where: { id: data.channelId } });
        if (!channel) throw new NotFoundException('Channel not found');

        const message = await this.prisma.message.create({
            data: {
                text: data.text,
                channelId: data.channelId,
                senderId: data.senderId,
                replyToId: data.replyToId,
            },
            include: {
                sender: true,
                channel: true,
                replyTo: {
                    include: { sender: true },
                },
            },
        });

        this.eventsGateway.emitMessageCreated(message);
        return message;
    }

    async update(id: string, data: { text?: string; isPinned?: boolean }) {
        const exists = await this.prisma.message.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Message not found');

        const message = await this.prisma.message.update({
            where: { id },
            data,
            include: {
                sender: true,
                channel: true,
            },
        });

        this.eventsGateway.emitMessageUpdated(message);
        return message;
    }

    async remove(id: string) {
        const exists = await this.prisma.message.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Message not found');

        await this.prisma.message.delete({ where: { id } });
        this.eventsGateway.emitMessageDeleted(id, exists.channelId);
        return { success: true };
    }
}
