import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit.service';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) { }

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

    // Audit log
    await this.auditService.log({
      action: 'create',
      entity: 'task',
      entityId: task.id,
      userId: task.assigneeId || undefined,
      userName: task.assignee?.name,
      details: { title: task.title, priority: task.priority, status: task.status },
    });

    // Create notification if task is assigned
    if (task.assigneeId) {
      try {
        await this.notificationsService.create({
          userId: task.assigneeId,
          type: 'task_assigned',
          title: 'New task assigned',
          message: `You've been assigned: ${task.title}`,
          relatedId: task.id,
          relatedType: 'task',
        });
      } catch (err) {
        console.error('Failed to create notification:', err);
      }
    }

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

    // Check if assignee changed
    const assigneeChanged = data.assigneeId !== undefined && data.assigneeId !== exists.assigneeId;

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

    // Audit log
    await this.auditService.log({
      action: 'update',
      entity: 'task',
      entityId: task.id,
      userId: task.assigneeId || undefined,
      userName: task.assignee?.name,
      details: {
        changes: Object.keys(data),
        title: task.title,
        status: task.status,
        priority: task.priority,
      },
    });

    // Create notification if assignee changed
    if (assigneeChanged && task.assigneeId) {
      try {
        await this.notificationsService.create({
          userId: task.assigneeId,
          type: 'task_assigned',
          title: 'Task assigned to you',
          message: `You've been assigned: ${task.title}`,
          relatedId: task.id,
          relatedType: 'task',
        });
      } catch (err) {
        console.error('Failed to create notification:', err);
      }
    }

    return task;
  }

  async remove(id: string) {
    const exists = await this.prisma.task.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Task not found');

    // Audit log before delete
    await this.auditService.log({
      action: 'delete',
      entity: 'task',
      entityId: id,
      details: { title: exists.title },
    });

    await this.prisma.task.delete({ where: { id } });
    this.eventsGateway.emitTaskDeleted(id);
    return { success: true };
  }
}


