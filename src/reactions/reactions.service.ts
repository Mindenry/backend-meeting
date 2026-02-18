import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  async addReaction(messageId: string, userId: string, emoji: string) {
    // Check if message exists
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Remove existing reaction from same user with same emoji (toggle)
    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      // Emit WebSocket event
      const reactions = await this.getReactions(messageId);
      this.eventsGateway.emitReactionRemoved(messageId, reactions);
      return { added: false };
    }

    // Add new reaction
    const reaction = await this.prisma.messageReaction.create({
      data: { messageId, userId, emoji },
      include: { user: { select: { id: true, name: true } } },
    });

    // Emit WebSocket event
    const reactions = await this.getReactions(messageId);
    this.eventsGateway.emitReactionAdded(messageId, reactions);

    return { added: true };
  }

  async getReactions(messageId: string) {
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, name: true } } },
    });

    // Group by emoji
    const grouped = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      acc[r.emoji].count++;
      acc[r.emoji].users.push({ id: r.user.id, name: r.user.name });
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: Array<{ id: string; name: string }> }>);

    return Object.values(grouped);
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    return { success: true };
  }
}

