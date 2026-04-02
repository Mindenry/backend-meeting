import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { CacheHelperService } from '../common/cache/cache-helper.service';
import { TaskWatchersService } from '../task-watchers/task-watchers.service';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
    private readonly cacheHelper: CacheHelperService,
    private readonly taskWatchersService: TaskWatchersService,
  ) {}

  findAll(params?: {
    status?: TaskStatus;
    teamId?: string;
    assigneeId?: string;
    meetingId?: string;
    priority?: string;
    search?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      status,
      teamId,
      assigneeId,
      meetingId,
      priority,
      search,
      dueDateFrom,
      dueDateTo,
      page,
      limit = 200,
      sortBy,
      sortOrder = 'asc',
    } = params || {};

    // Build due date range filter
    const dueDateFilter: any = {};
    if (dueDateFrom) dueDateFilter.gte = new Date(dueDateFrom);
    if (dueDateTo) dueDateFilter.lte = new Date(dueDateTo);

    // Build orderBy
    const orderBy: any[] = sortBy
      ? [{ [sortBy]: sortOrder }, { position: 'asc' }]
      : [{ position: 'asc' }, { createdAt: 'desc' }];

    const andClauses: any[] = [];

    if (assigneeId) {
      andClauses.push({
        OR: [{ assigneeId }],
      });
    }

    if (search) {
      andClauses.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      });
    }

    const where = {
      status: status || undefined,
      teamId: teamId || undefined,
      meetingId: meetingId || undefined,
      priority: priority || undefined,
      ...(Object.keys(dueDateFilter).length > 0
        ? { dueDate: dueDateFilter }
        : {}),
      ...(andClauses.length ? { AND: andClauses } : {}),
    };

    // Lightweight select for board/list views — only what the UI actually renders
    return (this.prisma.task as any).findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        position: true,
        tags: true,
        isRecurring: true,
        recurringPattern: true,
        recurringInterval: true,
        recurringEndDate: true,
        templateId: true,
        assigneeId: true,
        teamId: true,
        meetingId: true,
        createdAt: true,
        updatedAt: true,
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            subtasks: true,
            comments: true,
            attachments: true,
          },
        },
      },
      orderBy,
      ...(page ? { skip: (page - 1) * limit, take: limit } : { take: limit }),
    });
  }

  /**
   * Cursor-based pagination helper (INTERNAL — not exposed in controller yet).
   *
   * Usage: replace the `page` param with `cursor` in the controller to enable.
   * Returns `{ items, nextCursor }` for efficient deep pagination.
   *
   * To enable: add `@Query('cursor') cursor?: string` to the controller's findAll,
   * then call `findAllCursor({ ...params, cursor })` instead of `findAll()`.
   */
  async findAllCursor(params: {
    cursor?: string;
    limit?: number;
    teamId?: string;
    status?: string;
  }) {
    const { cursor, limit = 50, teamId, status } = params;

    const items = await (this.prisma.task as any).findMany({
      where: {
        teamId: teamId || undefined,
        status: status || undefined,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true,
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1, // Fetch one extra to detect "hasMore"
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop(); // Remove the extra sentinel item

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  findOne(id: string) {
    return (this.prisma.task as any).findUnique({
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
        reporter: true,
        project: true,
        component: true,
        version: true,
        parentTask: {
          select: { id: true, title: true, status: true },
        },
        childTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
          },
        },

        watchers: {
          include: {
            user: true,
          },
        },
        linkedIssues: {
          include: {
            target: {
              select: {
                id: true,
                title: true,
                issueType: true,
                status: true,
              },
            },
          },
        },
        linkedFrom: {
          include: {
            source: {
              select: {
                id: true,
                title: true,
                issueType: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            subtasks: true,
            timeEntries: true,
            attachments: true,
            linkedIssues: true,
            watchers: true,
          },
        },
      },
    });
  }

  async create(data: {
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low' | 'urgent';
    status?: TaskStatus;
    issueType?: 'task' | 'bug' | 'story' | 'epic' | 'subtask';
    resolution?: string | null;
    dueDate?: Date | null;
    tags?: string[];
    assigneeId?: string | null;
    assigneeIds?: string[];
    watcherIds?: string[];
    reporterId?: string | null;
    teamId?: string | null;
    meetingId?: string | null;
    sprintId?: string | null;
    epicId?: string | null;
    projectId?: string | null;
    componentId?: string | null;
    versionId?: string | null;
    storyPoints?: number | null;
    estimate?: number | null;
    isRecurring?: boolean;
    recurringPattern?: 'daily' | 'weekly' | 'monthly' | null;
    recurringInterval?: number | null;
    recurringEndDate?: Date | null;
    templateId?: string | null;
    position?: number;
    parentTaskId?: string | null;
    createdBy?: string;
  }) {
    const {
      assigneeId,
      assigneeIds,
      watcherIds,
      reporterId,
      teamId,
      meetingId,
      sprintId,
      epicId,
      projectId,
      componentId,
      versionId,
      parentTaskId,
      createdBy,
      ...rest
    } = data;

    // `createdBy` is NOT a Task scalar field in Prisma schema.
    // Use it as a fallback reporterId for audit/activity attribution.
    const effectiveReporterId = reporterId ?? createdBy ?? null;

    // ── Subtask: enforce 1-level nesting ──
    let inheritedTeamId = teamId;
    let inheritedProjectId = projectId;
    if (parentTaskId) {
      const parent = await (this.prisma.task as any).findUnique({
        where: { id: parentTaskId },
        select: { id: true, parentTaskId: true, teamId: true, projectId: true },
      });
      if (!parent) throw new NotFoundException('Parent task not found');
      if (parent.parentTaskId) {
        throw new BadRequestException(
          'Only 1 level of subtask nesting is allowed',
        );
      }
      // Inherit context from parent if not explicitly provided
      if (!inheritedTeamId) inheritedTeamId = parent.teamId;
      if (!inheritedProjectId) inheritedProjectId = parent.projectId;
    }

    // Get max position for the status column
    const maxPosition = await (this.prisma.task as any).findFirst({
      where: {
        status: rest.status || 'todo',
        teamId: inheritedTeamId || undefined,
      },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const normalizedAssigneeIds = Array.from(
      new Set(
        [...(assigneeIds ?? []), ...(assigneeId ? [assigneeId] : [])].filter(
          Boolean,
        ),
      ),
    );
    const primaryAssigneeId = assigneeId ?? normalizedAssigneeIds[0] ?? null;

    const task = await (this.prisma.task as any).create({
      data: {
        ...rest,
        tags: rest.tags ?? [],
        position: rest.position ?? (maxPosition?.position ?? 0) + 1,
        ...(primaryAssigneeId
          ? {
              assignee: {
                connect: { id: primaryAssigneeId },
              },
            }
          : {}),
        ...(effectiveReporterId
          ? {
              reporter: {
                connect: { id: effectiveReporterId },
              },
            }
          : {}),
        ...(inheritedTeamId
          ? {
              team: {
                connect: { id: inheritedTeamId },
              },
            }
          : {}),
        ...(meetingId
          ? {
              meeting: {
                connect: { id: meetingId },
              },
            }
          : {}),
        ...(sprintId
          ? {
              sprint: {
                connect: { id: sprintId },
              },
            }
          : {}),
        ...(epicId
          ? {
              epic: {
                connect: { id: epicId },
              },
            }
          : {}),
        ...(inheritedProjectId
          ? {
              project: {
                connect: { id: inheritedProjectId },
              },
            }
          : {}),
        ...(componentId
          ? {
              component: {
                connect: { id: componentId },
              },
            }
          : {}),
        ...(versionId
          ? {
              version: {
                connect: { id: versionId },
              },
            }
          : {}),
        ...(parentTaskId
          ? {
              parentTask: {
                connect: { id: parentTaskId },
              },
            }
          : {}),
      },
      include: {
        assignee: true,
        reporter: true,
        team: true,
        meeting: true,
        sprint: true,
        epic: true,
        project: true,
        component: true,
        version: true,

        subtasks: true,
      },
    });

    // Create activity log
    if (createdBy) {
      await this.prisma.taskActivityLog.create({
        data: {
          taskId: task.id,
          userId: createdBy,
          action: 'created',
        },
      });
    }

    this.eventsGateway.emitTaskCreated(task);

    // ── Auto-watch: creator + assignee ──
    if (createdBy) {
      try {
        await this.taskWatchersService.autoWatch(task.id, createdBy);
      } catch {}
    }
    if (task.assigneeId && task.assigneeId !== createdBy) {
      try {
        await this.taskWatchersService.autoWatch(task.id, task.assigneeId);
      } catch {}
    }

    // ── Create watchers for additional assignees (multi-assignee support) ──
    if (watcherIds && watcherIds.length > 0) {
      for (const watcherId of watcherIds) {
        if (watcherId !== createdBy && watcherId !== task.assigneeId) {
          try {
            await this.taskWatchersService.autoWatch(task.id, watcherId);
          } catch {}
        }
      }
    }

    // ── Activity log on parent task if this is a subtask ──
    if (parentTaskId && createdBy) {
      try {
        await this.prisma.taskActivityLog.create({
          data: {
            taskId: parentTaskId,
            userId: createdBy,
            action: 'subtask_created',
            newValue: task.title,
          },
        });
      } catch {}
    }

    // Audit log
    await this.auditService.log({
      action: 'create',
      entity: 'task',
      entityId: task.id,
      userId: createdBy || task.reporterId || task.assigneeId || undefined,
      userName: undefined,
      details: {
        title: task.title,
        priority: task.priority,
        status: task.status,
      },
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

    // Trigger workflow for task_created
    try {
      await this.workflowsService.triggerWorkflow('task_created', {
        id: task.id,
        title: task.title,
        description: task.description,
        assigneeId: task.assigneeId,
        teamId: task.teamId,
        sprintId: task.sprintId,
        epicId: task.epicId,
        priority: task.priority,
        status: task.status,
        createdAt: task.createdAt,
      });
    } catch (err) {
      console.error('Failed to trigger workflow:', err);
    }

    // Invalidate cache for assignee and team members
    if (task.assigneeId) {
      await this.cacheHelper.invalidateUserDashboard(task.assigneeId);
    }
    if (task.teamId) {
      await this.cacheHelper.invalidateTeamDashboards(task.teamId);
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
      issueType?: 'task' | 'bug' | 'story' | 'epic' | 'subtask';
      resolution?: string | null;
      dueDate: Date | null;
      tags: string[];
      assigneeId?: string | null;
      assigneeIds?: string[];
      reporterId?: string | null;
      teamId?: string | null;
      meetingId?: string | null;
      sprintId?: string | null;
      epicId?: string | null;
      projectId?: string | null;
      componentId?: string | null;
      versionId?: string | null;
      storyPoints?: number | null;
      estimate?: number | null;
      isRecurring?: boolean;
      recurringPattern?: 'daily' | 'weekly' | 'monthly' | null;
      recurringInterval?: number | null;
      recurringEndDate?: Date | null;
      templateId?: string | null;
      position?: number;
    }>,
    userId?: string,
  ) {
    const exists = await (this.prisma.task as any).findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Task not found');

    // Check if assignee changed
    const assigneeChanged =
      data.assigneeId !== undefined && data.assigneeId !== exists.assigneeId;

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

    if (
      data.assigneeId !== undefined &&
      data.assigneeId !== exists.assigneeId
    ) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'assigned',
        oldValue: exists.assigneeId,
        newValue: data.assigneeId,
      });
    }

    if (
      data.dueDate !== undefined &&
      data.dueDate?.getTime() !== exists.dueDate?.getTime()
    ) {
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

    if (
      data.storyPoints !== undefined &&
      data.storyPoints !== exists.storyPoints
    ) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'story_points_changed',
        oldValue: exists.storyPoints?.toString(),
        newValue: data.storyPoints?.toString(),
      });
    }

    if (
      data.description !== undefined &&
      data.description !== exists.description
    ) {
      activityLogs.push({
        taskId: id,
        userId,
        action: 'description_changed',
      });
    }

    const {
      assigneeId,
      assigneeIds,
      reporterId,
      teamId,
      meetingId,
      sprintId,
      epicId,
      projectId,
      componentId,
      versionId,
      ...scalarData
    } = data;

    // Normalize recurrence values
    if ((scalarData as any).isRecurring === false) {
      (scalarData as any).recurringPattern = null;
      (scalarData as any).recurringInterval = null;
      (scalarData as any).recurringEndDate = null;
    }

    const updateData: any = {
      ...scalarData,
    };

    updateData.assignee = assigneeId
      ? { connect: { id: assigneeId } }
      : { disconnect: true };
    if (reporterId !== undefined) {
      updateData.reporter = reporterId
        ? { connect: { id: reporterId } }
        : { disconnect: true };
    }
    if (teamId !== undefined) {
      updateData.team = teamId
        ? { connect: { id: teamId } }
        : { disconnect: true };
    }
    if (meetingId !== undefined) {
      updateData.meeting = meetingId
        ? { connect: { id: meetingId } }
        : { disconnect: true };
    }
    if (sprintId !== undefined) {
      updateData.sprint = sprintId
        ? { connect: { id: sprintId } }
        : { disconnect: true };
    }
    if (epicId !== undefined) {
      updateData.epic = epicId
        ? { connect: { id: epicId } }
        : { disconnect: true };
    }
    if (projectId !== undefined) {
      updateData.project = projectId
        ? { connect: { id: projectId } }
        : { disconnect: true };
    }
    if (componentId !== undefined) {
      updateData.component = componentId
        ? { connect: { id: componentId } }
        : { disconnect: true };
    }
    if (versionId !== undefined) {
      updateData.version = versionId
        ? { connect: { id: versionId } }
        : { disconnect: true };
    }

    if (assigneeIds !== undefined) {
      const normalizedAssigneeIds = Array.from(
        new Set((assigneeIds ?? []).filter(Boolean)),
      );
      updateData.assigneeId = normalizedAssigneeIds[0] ?? null;
    }

    const task = await (this.prisma.task as any).update({
      where: { id },
      data: updateData,
      include: {
        assignee: true,
        team: true,
        meeting: true,
        sprint: true,
        epic: true,
        project: true,
        component: true,
        version: true,

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
      userName: undefined,
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

      // Auto-watch new assignee
      try {
        await this.taskWatchersService.autoWatch(task.id, task.assigneeId);
      } catch {}
    }

    // Trigger workflow if task was completed
    if (data.status === 'done' && exists.status !== 'done') {
      try {
        await this.workflowsService.triggerWorkflow('task_completed', {
          id: task.id,
          title: task.title,
          description: task.description,
          assigneeId: task.assigneeId,
          teamId: task.teamId,
          sprintId: task.sprintId,
          epicId: task.epicId,
          priority: task.priority,
          createdAt: task.createdAt,
          completedAt: task.updatedAt,
        });
      } catch (err) {
        console.error('Failed to trigger workflow:', err);
      }
    }

    // Invalidate cache for assignee and team members
    if (task.assigneeId) {
      await this.cacheHelper.invalidateUserDashboard(task.assigneeId);
    }
    if (task.teamId) {
      await this.cacheHelper.invalidateTeamDashboards(task.teamId);
    }

    return task;
  }

  async updatePosition(
    taskId: string,
    newStatus: string,
    newPosition: number,
    teamId?: string,
  ) {
    const task = await (this.prisma.task as any).findUnique({
      where: { id: taskId },
    });
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
    const task = await (this.prisma.task as any).findUnique({
      where: { id: taskId },
    });
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

  async updateSubtask(
    subtaskId: string,
    data: { title?: string; isCompleted?: boolean; position?: number },
  ) {
    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });
  }

  async deleteSubtask(subtaskId: string) {
    return this.prisma.subtask.delete({ where: { id: subtaskId } });
  }

  async addTimeEntry(
    taskId: string,
    userId: string,
    hours: number,
    description?: string,
    date?: Date,
  ) {
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

  async addAttachment(
    taskId: string,
    userId: string,
    name: string,
    url: string,
    mimeType?: string,
    size?: number,
  ) {
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

  // Issue Links
  async addIssueLink(sourceId: string, targetId: string, type: string) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot link task to itself');
    }

    const source = await (this.prisma.task as any).findUnique({
      where: { id: sourceId },
    });
    const target = await (this.prisma.task as any).findUnique({
      where: { id: targetId },
    });

    if (!source || !target) {
      throw new NotFoundException('Source or target task not found');
    }

    const existing = await (this.prisma as any).issueLink.findUnique({
      where: {
        sourceId_targetId_type: { sourceId, targetId, type },
      },
    });

    if (existing) {
      throw new BadRequestException('Link already exists');
    }

    const link = await (this.prisma as any).issueLink.create({
      data: { sourceId, targetId, type },
      include: {
        source: { select: { id: true, title: true, issueType: true, status: true } },
        target: { select: { id: true, title: true, issueType: true, status: true } },
      },
    });

    // Log activity
    if (source.reporterId) {
      await this.prisma.taskActivityLog.create({
        data: {
          taskId: sourceId,
          userId: source.reporterId,
          action: 'link_added',
          newValue: `${type}:${target.title}`,
        },
      });
    }

    return link;
  }

  async getIssueLinks(taskId: string) {
    const [outgoing, incoming] = await Promise.all([
      (this.prisma as any).issueLink.findMany({
        where: { sourceId: taskId },
        include: {
          target: { select: { id: true, title: true, issueType: true, status: true } },
        },
      }),
      (this.prisma as any).issueLink.findMany({
        where: { targetId: taskId },
        include: {
          source: { select: { id: true, title: true, issueType: true, status: true } },
        },
      }),
    ]);

    return [
      ...outgoing.map((l: any) => ({ ...l, direction: 'outgoing' })),
      ...incoming.map((l: any) => ({ ...l, direction: 'incoming' })),
    ];
  }

  async deleteIssueLink(linkId: string) {
    const link = await (this.prisma as any).issueLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Issue link not found');
    }

    await (this.prisma as any).issueLink.delete({ where: { id: linkId } });
    return { success: true };
  }

  async getTemplates(filters?: { teamId?: string; createdById?: string }) {
    const { teamId, createdById } = filters || {};
    return (this.prisma as any).taskTemplate.findMany({
      where: {
        teamId: teamId || undefined,
        createdById: createdById || undefined,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTemplate(id: string) {
    const template = await (this.prisma as any).taskTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Task template not found');
    return template;
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    title: string;
    content?: string;
    priority?: string;
    issueType?: string;
    tags?: string[];
    storyPoints?: number;
    estimate?: number;
    teamId?: string;
    projectId?: string;
    componentId?: string;
    versionId?: string;
    createdById: string;
  }) {
    return (this.prisma as any).taskTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        title: data.title,
        content: data.content,
        priority: data.priority ?? 'medium',
        issueType: data.issueType ?? 'task',
        tags: data.tags ?? [],
        storyPoints: data.storyPoints,
        estimate: data.estimate,
        teamId: data.teamId,
        projectId: data.projectId,
        componentId: data.componentId,
        versionId: data.versionId,
        createdById: data.createdById,
      },
    });
  }

  async updateTemplate(
    id: string,
    data: Partial<{
      name: string;
      description?: string;
      title: string;
      content?: string;
      priority?: string;
      issueType?: string;
      tags?: string[];
      storyPoints?: number | null;
      estimate?: number | null;
      teamId?: string | null;
      projectId?: string | null;
      componentId?: string | null;
      versionId?: string | null;
    }>,
  ) {
    const exists = await (this.prisma as any).taskTemplate.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Task template not found');

    return (this.prisma as any).taskTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteTemplate(id: string) {
    const exists = await (this.prisma as any).taskTemplate.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Task template not found');
    await (this.prisma as any).taskTemplate.delete({ where: { id } });
    return { success: true };
  }

  async createTaskFromTemplate(
    templateId: string,
    data: {
      createdBy: string;
      assigneeId?: string;
      assigneeIds?: string[];
      teamId?: string;
      projectId?: string;
      componentId?: string;
      versionId?: string;
      dueDate?: Date;
      meetingId?: string;
      sprintId?: string;
      epicId?: string;
      titleOverride?: string;
      descriptionOverride?: string;
    },
  ) {
    const template = await (this.prisma as any).taskTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Task template not found');

    return this.create({
      title: data.titleOverride || template.title,
      description:
        data.descriptionOverride ||
        template.content ||
        template.description ||
        undefined,
      priority: template.priority || 'medium',
      issueType: template.issueType || 'task',
      tags: template.tags || [],
      storyPoints: template.storyPoints,
      estimate: template.estimate,
      assigneeId: data.assigneeId,
      assigneeIds: data.assigneeIds,
      teamId: data.teamId ?? template.teamId ?? null,
      projectId: data.projectId ?? template.projectId ?? null,
      componentId: data.componentId ?? template.componentId ?? null,
      versionId: data.versionId ?? template.versionId ?? null,
      dueDate: data.dueDate ?? null,
      meetingId: data.meetingId ?? null,
      sprintId: data.sprintId ?? null,
      epicId: data.epicId ?? null,
      templateId: template.id,
      createdBy: data.createdBy,
    });
  }

  async generateRecurringTasks(untilDate?: Date) {
    const now = new Date();
    const horizon =
      untilDate ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const recurringTasks = await (this.prisma.task as any).findMany({
      where: {
        isRecurring: true,
        recurringPattern: { not: null },
        OR: [{ recurringEndDate: null }, { recurringEndDate: { gte: now } }],
      },
    });

    let created = 0;

    for (const task of recurringTasks) {
      const baseDate = task.dueDate ?? task.createdAt;
      if (!baseDate) continue;

      const interval = Math.max(1, task.recurringInterval ?? 1);
      const nextDue = new Date(baseDate);

      while (nextDue <= now) {
        if (task.recurringPattern === 'daily') {
          nextDue.setDate(nextDue.getDate() + interval);
        } else if (task.recurringPattern === 'weekly') {
          nextDue.setDate(nextDue.getDate() + 7 * interval);
        } else if (task.recurringPattern === 'monthly') {
          nextDue.setMonth(nextDue.getMonth() + interval);
        } else {
          break;
        }
      }

      if (nextDue > horizon) continue;
      if (task.recurringEndDate && nextDue > task.recurringEndDate) continue;

      const alreadyExists = await (this.prisma.task as any).findFirst({
        where: {
          parentTaskId: task.id,
          dueDate: nextDue,
        },
      });
      if (alreadyExists) continue;

      await this.create({
        title: task.title,
        description: task.description ?? undefined,
        priority: task.priority,
        status: 'todo',
        issueType: task.issueType,
        resolution: null,
        dueDate: nextDue,
        tags: task.tags,
        assigneeId: task.assigneeId,
        reporterId: task.reporterId,
        teamId: task.teamId,
        meetingId: null,
        sprintId: task.sprintId,
        epicId: task.epicId,
        projectId: task.projectId,
        componentId: task.componentId,
        versionId: task.versionId,
        storyPoints: task.storyPoints,
        estimate: task.estimate,
        isRecurring: false,
        recurringPattern: null,
        recurringInterval: null,
        recurringEndDate: null,
        templateId: task.templateId,
        parentTaskId: task.id,
        createdBy: task.reporterId ?? undefined,
      });
      created += 1;
    }

    return { success: true, created };
  }

  async getAnalytics(teamId?: string) {
    const where = teamId ? { teamId } : {};

    const [total, byStatus, byPriority, byAssignee, timeSpent] =
      await Promise.all([
        (this.prisma.task as any).count({ where }),
        (this.prisma.task as any).groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        (this.prisma.task as any).groupBy({
          by: ['priority'],
          where,
          _count: true,
        }),
        (this.prisma.task as any).groupBy({
          by: ['assigneeId'],
          where: { ...where, assigneeId: { not: null } },
          _count: true,
        }),
        this.prisma.timeEntry.aggregate({
          where: teamId
            ? {
                task: { teamId },
              }
            : {},
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
    const exists = await (this.prisma.task as any).findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Task not found');

    // Audit log before delete
    await this.auditService.log({
      action: 'delete',
      entity: 'task',
      entityId: id,
      details: { title: exists.title },
    });

    await (this.prisma.task as any).delete({ where: { id } });
    this.eventsGateway.emitTaskDeleted(id);
    return { success: true };
  }
}
