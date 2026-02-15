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
    
    // Check if assignee changed
    const assigneeChanged = data.assigneeId !== undefined && data.assigneeId !== exists.assigneeId;
    
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


