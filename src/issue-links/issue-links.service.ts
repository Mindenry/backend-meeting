import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

export const LINK_TYPES = ['blocks', 'is_blocked_by', 'relates_to', 'duplicates'] as const;
export type LinkType = typeof LINK_TYPES[number];

// Inverse mapping for bidirectional display
const INVERSE_LINK_TYPE: Record<string, string> = {
  blocks: 'is_blocked_by',
  is_blocked_by: 'blocks',
  relates_to: 'relates_to',
  duplicates: 'duplicates',
};

@Injectable()
export class IssueLinksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(data: { sourceId: string; targetId: string; type: string }, userId?: string) {
    if (data.sourceId === data.targetId) {
      throw new BadRequestException('Cannot link a task to itself');
    }

    if (!LINK_TYPES.includes(data.type as LinkType)) {
      throw new BadRequestException(`Invalid link type: ${data.type}. Must be one of: ${LINK_TYPES.join(', ')}`);
    }

    // Check for duplicate (including reverse direction)
    const existing = await this.prisma.issueLink.findFirst({
      where: {
        OR: [
          { sourceId: data.sourceId, targetId: data.targetId, type: data.type },
          { sourceId: data.targetId, targetId: data.sourceId, type: INVERSE_LINK_TYPE[data.type] },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('This link already exists');
    }

    // Cross-team safety guard: prevent linking tasks from different teams
    const [sourceTask, targetTask] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: data.sourceId }, select: { teamId: true } }),
      this.prisma.task.findUnique({ where: { id: data.targetId }, select: { teamId: true } }),
    ]);
    if (!sourceTask) throw new BadRequestException('Source task not found');
    if (!targetTask) throw new BadRequestException('Target task not found');
    if (sourceTask.teamId && targetTask.teamId && sourceTask.teamId !== targetTask.teamId) {
      throw new BadRequestException('Cannot link tasks from different teams');
    }

    const link = await this.prisma.issueLink.create({
      data,
      include: {
        source: { select: { id: true, title: true, status: true, issueType: true } },
        target: { select: { id: true, title: true, status: true, issueType: true } },
      },
    });

    // Log activity on both tasks
    await this.prisma.taskActivityLog.createMany({
      data: [
        {
          taskId: data.sourceId,
          userId,
          action: 'link_created',
          newValue: `${data.type} → ${link.target.title}`,
        },
        {
          taskId: data.targetId,
          userId,
          action: 'link_created',
          newValue: `${INVERSE_LINK_TYPE[data.type]} → ${link.source.title}`,
        },
      ],
    });

    // Emit WebSocket event
    this.eventsGateway.server?.emit('issueLinkCreated', link);

    return link;
  }

  async findByTaskId(taskId: string) {
    const [outgoing, incoming] = await Promise.all([
      this.prisma.issueLink.findMany({
        where: { sourceId: taskId },
        include: {
          target: {
            select: { id: true, title: true, status: true, priority: true, issueType: true, assigneeId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.issueLink.findMany({
        where: { targetId: taskId },
        include: {
          source: {
            select: { id: true, title: true, status: true, priority: true, issueType: true, assigneeId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Normalize to a unified format: { id, type, linkedTask }
    const links = [
      ...outgoing.map((l) => ({
        id: l.id,
        type: l.type,
        direction: 'outgoing' as const,
        linkedTask: l.target,
        createdAt: l.createdAt,
      })),
      ...incoming.map((l) => ({
        id: l.id,
        type: INVERSE_LINK_TYPE[l.type] || l.type,
        direction: 'incoming' as const,
        linkedTask: l.source,
        createdAt: l.createdAt,
      })),
    ];

    return links;
  }

  async remove(id: string, userId?: string) {
    const link = await this.prisma.issueLink.findUnique({
      where: { id },
      include: {
        source: { select: { id: true, title: true } },
        target: { select: { id: true, title: true } },
      },
    });

    if (!link) return null;

    await this.prisma.issueLink.delete({ where: { id } });

    // Log activity on both tasks
    await this.prisma.taskActivityLog.createMany({
      data: [
        {
          taskId: link.sourceId,
          userId,
          action: 'link_removed',
          oldValue: `${link.type} → ${link.target.title}`,
        },
        {
          taskId: link.targetId,
          userId,
          action: 'link_removed',
          oldValue: `${INVERSE_LINK_TYPE[link.type]} → ${link.source.title}`,
        },
      ],
    });

    this.eventsGateway.server?.emit('issueLinkDeleted', { id, sourceId: link.sourceId, targetId: link.targetId });

    return { deleted: true };
  }
}
