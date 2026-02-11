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
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        activityLog: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low' | 'urgent';
    status?: TaskStatus;
    dueDate?: Date | null;
    tags?: string[];
    assigneeId?: string | null;
    teamId?: string | null;
    meetingId?: string | null;
    createdBy?: string;
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

    // Create activity log
    if (data.createdBy) {
      await this.prisma.taskActivityLog.create({
        data: {
          taskId: task.id,
          userId: data.createdBy,
          action: 'created',
        },
      });
    }

    this.eventsGateway.emitTaskCreated(task);
    return task;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description?: string;
      priority: 'high' | 'medium' | 'low' | 'urgent';
      status: TaskStatus;
      dueDate: Date | null;
      tags: string[];
      assigneeId?: string | null;
      teamId?: string | null;
      meetingId?: string | null;
    }>,
    userId?: string,
  ) {
    const exists = await this.prisma.task.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Task not found');

    // Track changes for activity log
    const activityLogs: any[] = [];

    if (data.status !== undefined && data.status !== exists.status) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'status_changed',
        oldValue: exists.status,
        newValue: data.status,
      });
    }

    if (data.assigneeId !== undefined && data.assigneeId !== exists.assigneeId) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'assigned',
        oldValue: exists.assigneeId,
        newValue: data.assigneeId,
      });
    }

    if (data.dueDate !== undefined && data.dueDate?.getTime() !== exists.dueDate?.getTime()) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'due_date_changed',
        oldValue: exists.dueDate?.toISOString(),
        newValue: data.dueDate?.toISOString(),
      });
    }

    if (data.priority !== undefined && data.priority !== exists.priority) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'priority_changed',
        oldValue: exists.priority,
        newValue: data.priority,
      });
    }

    const task = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: true,
        team: true,
        meeting: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        activityLog: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Create activity logs
    if (activityLogs.length > 0) {
      await this.prisma.taskActivityLog.createMany({
        data: activityLogs,
      });
    }

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


