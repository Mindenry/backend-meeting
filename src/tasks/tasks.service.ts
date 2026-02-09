import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  findAll(params?: {
    status?: TaskStatus;
    teamId?: string;
    assigneeId?: string;
  }) {
    const { status, teamId, assigneeId } = params || {};
    return this.prisma.task.findMany({
      where: {
        status: status || undefined,
        teamId: teamId || undefined,
        assigneeId: assigneeId || undefined,
      },
      include: {
        assignee: true,
        team: true,
        meeting: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        team: true,
        meeting: true,
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    status?: TaskStatus;
    dueDate?: Date | null;
    tags?: string[];
    assigneeId?: string | null;
    teamId?: string | null;
    meetingId?: string | null;
  }) {
    const task = await this.prisma.task.create({
      data: {
        ...data,
        tags: data.tags ?? [],
      },
      include: {
        assignee: true,
        team: true,
        meeting: true,
      },
    });
    this.eventsGateway.emitTaskCreated(task);
    return task;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description?: string;
      priority: 'high' | 'medium' | 'low';
      status: TaskStatus;
      dueDate: Date | null;
      tags: string[];
      assigneeId?: string | null;
      teamId?: string | null;
      meetingId?: string | null;
    }>,
  ) {
    const exists = await this.prisma.task.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Task not found');
    const task = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: true,
        team: true,
        meeting: true,
      },
    });
    this.eventsGateway.emitTaskUpdated(task);
    return task;
  }

  async remove(id: string) {
    const exists = await this.prisma.task.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id } });
    this.eventsGateway.emitTaskDeleted(id);
    return { success: true };
  }
}


