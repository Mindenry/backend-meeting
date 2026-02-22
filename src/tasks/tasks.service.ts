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
    sprintId?: string;
    epicId?: string;
    priority?: string;
    search?: string;
  }) {
    const { status, teamId, assigneeId, sprintId, epicId, priority, search } = params || {};
    return this.prisma.task.findMany({
      where: {
        status: status || undefined,
        teamId: teamId || undefined,
        assigneeId: assigneeId || undefined,
        sprintId: sprintId || undefined,
        epicId: epicId || undefined,
        priority: priority || undefined,
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        assignee: true,
        team: true,
        meeting: true,
        sprint: true,
        epic: true,
        subtasks: { orderBy: { position: 'asc' } },
        _count: {
          select: {
            subtasks: true,
            timeEntries: true,
            attachments: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: true,
        team: true,
        meeting: true,
        sprint: true,
        epic: true,
        subtasks: { orderBy: { position: 'asc' } },
        timeEntries: {
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
          orderBy: { startTime: 'desc' },
        },
        attachments: {
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
    sprintId?: string | null;
    epicId?: string | null;
    storyPoints?: number | null;
    estimate?: number | null;
    position?: number;
    createdBy?: string;
  }) {
    // Get max position for the status column
    const maxPosition = await this.prisma.task.findFirst({
      where: {
        status: data.status || 'todo',
        teamId: data.teamId || undefined,
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const task = await this.prisma.task.create({
      data: {
        ...data,
        tags: data.tags ?? [],
        position: data.position ?? (maxPosition?.position ?? 0) + 1,
      },
      include: {
        assignee: true,
        team: true,
        meeting: true,
        sprint: true,
        epic: true,
        subtasks: true,
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
      sprintId?: string | null;
      epicId?: string | null;
      storyPoints?: number | null;
      estimate?: number | null;
      position?: number;
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

    if (data.sprintId !== undefined && data.sprintId !== exists.sprintId) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'sprint_changed',
        oldValue: exists.sprintId,
        newValue: data.sprintId,
      });
    }

    if (data.epicId !== undefined && data.epicId !== exists.epicId) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'epic_changed',
        oldValue: exists.epicId,
        newValue: data.epicId,
      });
    }

    if (data.storyPoints !== undefined && data.storyPoints !== exists.storyPoints) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'story_points_changed',
        oldValue: exists.storyPoints?.toString(),
        newValue: data.storyPoints?.toString(),
      });
    }
    const task = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: true,
        team: true,
        meeting: true,
        sprint: true,
        epic: true,
        subtasks: { orderBy: { position: 'asc' } },
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

  async updatePosition(taskId: string, newStatus: string, newPosition: number, teamId?: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // Update task position and status
    return this.update(
      taskId,
      {
        status: newStatus as TaskStatus,
        position: newPosition,
      },
      undefined,
    );
  }

  async addSubtask(taskId: string, title: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const maxPosition = await this.prisma.subtask.findFirst({
      where: { taskId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.subtask.create({
      data: {
        taskId,
        title,
        position: (maxPosition?.position ?? 0) + 1,
      },
    });
  }

  async updateSubtask(subtaskId: string, data: { title?: string; isCompleted?: boolean; position?: number }) {
    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });
  }

  async deleteSubtask(subtaskId: string) {
    return this.prisma.subtask.delete({ where: { id: subtaskId } });
  }

  async addTimeEntry(taskId: string, userId: string, hours: number, description?: string, date?: Date) {
    return this.prisma.timeEntry.create({
      data: {
        taskId,
        userId,
        duration: Math.round(hours * 3600), // Convert hours to seconds
        description,
        startTime: date || new Date(),
      },
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
    });
  }

  async deleteTimeEntry(timeEntryId: string) {
    return this.prisma.timeEntry.delete({ where: { id: timeEntryId } });
  }

  async addAttachment(taskId: string, userId: string, name: string, url: string, mimeType?: string, size?: number) {
    return this.prisma.taskAttachment.create({
      data: {
        taskId,
        userId,
        name,
        url,
        mimeType,
        size,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteAttachment(attachmentId: string) {
    return this.prisma.taskAttachment.delete({ where: { id: attachmentId } });
  }

  async getAnalytics(teamId?: string) {
    const where = teamId ? { teamId } : {};
    
    const [total, byStatus, byPriority, byAssignee, timeSpent] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: { ...where, assigneeId: { not: null } },
        _count: true,
      }),
      this.prisma.timeEntry.aggregate({
        where: teamId ? {
          task: { teamId },
        } : {},
        _sum: { duration: true },
      }),
    ]);

    return {
      total,
      byStatus,
      byPriority,
      byAssignee,
      totalTimeSpent: (timeSpent._sum.duration || 0) / 3600, // Convert seconds back to hours
    };
  }

  async getActivity(teamId?: string, limit: number = 20) {
    const where: any = {};
    
    if (teamId) {
      where.task = { teamId };
    }

    return this.prisma.taskActivityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
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


