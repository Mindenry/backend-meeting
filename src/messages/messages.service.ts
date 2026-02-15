import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => EventsGateway))
        private readonly eventsGateway: EventsGateway,
        private readonly notificationsService: NotificationsService,
    ) { }

    async findByChannel(channelId: string, params?: { limit?: number; before?: string }) {
        const { limit = 50, before } = params || {};

        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) throw new NotFoundException('Channel not found');

        return this.prisma.message.findMany({
            where: {
                channelId,
                threadId: null, // Only get main messages, not thread replies
                ...(before ? { createdAt: { lt: new Date(before) } } : {}),
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: true,
                replyTo: {
                    include: { sender: true },
                },
                reactions: {
                    include: { user: { select: { id: true, name: true } } },
                },
                _count: {
                    select: { replies: true },
                },
            },
        }).then(messages => messages.reverse());
    }

    async create(data: {
        text: string;
        channelId: string;
        senderId: string;
        replyToId?: string;
        attachments?: Array<{ url: string; name: string; type: string }>;
        mentions?: string[];
    }) {
        const channel = await this.prisma.channel.findUnique({ where: { id: data.channelId } });
        if (!channel) throw new NotFoundException('Channel not found');

        const message = await this.prisma.message.create({
            data: {
                text: data.text,
                channelId: data.channelId,
                senderId: data.senderId,
                replyToId: data.replyToId,
                attachments: data.attachments ? data.attachments as any : null,
                mentions: data.mentions || [],
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
        
        // Create notifications for mentioned users
        if (data.mentions && data.mentions.length > 0) {
            try {
                const notifications = data.mentions
                    .filter(mentionId => mentionId !== data.senderId) // Don't notify self
                    .map(mentionId =>
                        this.notificationsService.create({
                            userId: mentionId,
                            type: 'message_mention',
                            title: 'You were mentioned',
                            message: `${message.sender.name} mentioned you in #${channel.name}: ${data.text.slice(0, 100)}`,
                            relatedId: message.id,
                            relatedType: 'message',
                        }).catch(err => {
                            console.error(`Failed to create mention notification for user ${mentionId}:`, err);
                        })
                    );
                
                await Promise.allSettled(notifications);
            } catch (err) {
                console.error('Failed to create mention notifications:', err);
            }
        }
        
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
