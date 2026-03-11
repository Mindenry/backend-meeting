import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ThreadsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createThread(channelId: string, messageId: string) {
    // Check if message exists
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });

    if (!message || message.channelId !== channelId) {
      throw new NotFoundException('Message not found');
    }

    // Check if thread already exists
    const existing = await this.prisma.thread.findUnique({
      where: { messageId },
    });

    if (existing) {
      return existing;
    }

    // Create thread
    const thread = await this.prisma.thread.create({
      data: {
        messageId,
        channelId,
      },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Emit WebSocket event
    this.eventsGateway.emitThreadCreated(thread);

    return thread;
  }

  async getThread(threadId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
        replies: {
          include: {
            sender: { select: { id: true, name: true } },
            reactions: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    return thread;
  }

  async getThreadsByChannel(channelId: string) {
    return this.prisma.thread.findMany({
      where: { channelId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
        replies: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async addReply(threadId: string, senderId: string, text: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const reply = await this.prisma.message.create({
      data: {
        text,
        senderId,
        channelId: thread.channelId,
        threadId: thread.id,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    // Update thread updatedAt
    await this.prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Emit WebSocket event
    this.eventsGateway.emitThreadReplyAdded(threadId, reply);

    return reply;
  }
}
