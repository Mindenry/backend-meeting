import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
  ) {}

  async findByChannel(
    channelId: string,
    params?: { limit?: number; before?: string; userId?: string },
  ) {
    const { limit = 50, before, userId } = params || {};

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const messages = await this.prisma.message.findMany({
      where: {
        channelId,
        threadId: null, // Only get main messages, not thread replies
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reads: userId
          ? {
              where: { userId },
            }
          : false,
      },
    });

    // Mark messages as read for the user
    if (userId && messages.length > 0) {
      const messageIds = messages.map((m) => m.id);
      const existingReads = await this.prisma.messageRead.findMany({
        where: {
          messageId: { in: messageIds },
          userId,
        },
      });

      const unreadMessageIds = messageIds.filter(
        (id) => !existingReads.some((r) => r.messageId === id),
      );

      if (unreadMessageIds.length > 0) {
        await this.prisma.messageRead.createMany({
          data: unreadMessageIds.map((messageId) => ({
            messageId,
            userId,
          })),
        });
      }
    }

    return messages.reverse();
  }

  async search(params: {
    query: string;
    channelId?: string;
    senderId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const {
      query,
      channelId,
      senderId,
      startDate,
      endDate,
      limit = 50,
    } = params;

    const where: any = {
      text: {
        contains: query,
        mode: 'insensitive',
      },
    };

    if (channelId) {
      where.channelId = channelId;
    }

    if (senderId) {
      where.senderId = senderId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    return this.prisma.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: {
          select: { replies: true },
        },
      },
    });
  }

  async markAsRead(messageId: string, userId: string) {
    const existing = await this.prisma.messageRead.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.messageRead.create({
      data: {
        messageId,
        userId,
      },
    });
  }

  async getUnreadCount(channelId: string, userId: string) {
    const totalMessages = await this.prisma.message.count({
      where: { channelId },
    });

    const readMessages = await this.prisma.messageRead.count({
      where: {
        userId,
        message: {
          channelId,
        },
      },
    });

    return totalMessages - readMessages;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DIRECT MESSAGES (DM)
  // ─────────────────────────────────────────────────────────────────────────────

  async createDirectMessage(data: {
    id: string;
    text: string;
    senderId: string;
    receiverId: string;
    createdAt?: string;
    attachments?: Array<{ url: string; name: string; type: string }>;
    mentions?: string[];
  }) {
    // Persist DM using existing client-generated ID so frontend can reconcile
    const created = await this.prisma.directMessage.create({
      data: {
        id: data.id,
        text: data.text,
        senderId: data.senderId,
        receiverId: data.receiverId,
        attachments: data.attachments ? (data.attachments as any) : null,
        mentions: data.mentions || [],
        ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification for receiver so it appears in Notifications page
    try {
      await this.notificationsService.notifyDirectMessage(
        data.receiverId,
        data.senderId,
        data.text,
        created.id,
      );
    } catch (err) {
      console.error('Failed to create direct message notification:', err);
    }

    return created;
  }

  async getDirectMessages(
    userId: string,
    otherUserId: string,
    params?: { limit?: number; before?: string },
  ) {
    if (!userId || !otherUserId) {
      throw new Error('Both userId and otherUserId are required');
    }

    const { limit = 100, before } = params || {};

    // Query messages where current user is either sender or receiver
    // and the other user is the opposite party
    const where: any = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };

    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    console.log(
      `[DM] Querying messages between ${userId} and ${otherUserId}, limit: ${limit}`,
    );

    const messages = await this.prisma.directMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    console.log(
      `[DM] Found ${messages.length} messages between ${userId} and ${otherUserId}`,
    );

    return messages;
  }

  async create(data: {
    text: string;
    channelId: string;
    senderId: string;
    replyToId?: string;
    attachments?: Array<{ url: string; name: string; type: string }>;
    mentions?: string[];
  }) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: data.channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const message = await this.prisma.message.create({
      data: {
        text: data.text,
        channelId: data.channelId,
        senderId: data.senderId,
        replyToId: data.replyToId,
        attachments: data.attachments ? (data.attachments as any) : null,
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
          .filter((mentionId) => mentionId !== data.senderId) // Don't notify self
          .map((mentionId) =>
            this.notificationsService
              .create({
                userId: mentionId,
                type: 'message_mention',
                title: 'You were mentioned',
                message: `${message.sender.name} mentioned you in #${channel.name}: ${data.text.slice(0, 100)}`,
                relatedId: message.id,
                relatedType: 'message',
              })
              .catch((err) => {
                console.error(
                  `Failed to create mention notification for user ${mentionId}:`,
                  err,
                );
              }),
          );

        await Promise.allSettled(notifications);

        // Trigger workflow for message_mentioned
        try {
          await this.workflowsService.triggerWorkflow('message_mentioned', {
            messageId: message.id,
            channelId: channel.id,
            channelName: channel.name,
            teamId: channel.teamId,
            senderId: message.senderId,
            senderName: message.sender.name,
            text: data.text,
            mentions: data.mentions,
            createdAt: message.createdAt,
          });
        } catch (err) {
          console.error('Failed to trigger workflow:', err);
        }
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
