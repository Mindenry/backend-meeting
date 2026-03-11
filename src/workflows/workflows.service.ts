import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { TasksService } from '../tasks/tasks.service';
import { MeetingsService } from '../meetings/meetings.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => MeetingsService))
    private readonly meetingsService: MeetingsService,
    private readonly auditService: AuditService,
  ) {}

  // Workflow Management
  async createWorkflow(data: {
    name: string;
    description?: string;
    trigger: string;
    conditions?: any;
    actions: any[];
    teamId?: string;
    createdBy: string;
  }) {
    const workflow = await this.prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        trigger: data.trigger,
        conditions: data.conditions,
        actions: data.actions,
        teamId: data.teamId,
        createdBy: data.createdBy,
      },
      include: {
        creator: true,
        team: true,
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'workflow',
      entityId: workflow.id,
      userId: data.createdBy,
    });

    return workflow;
  }

  async findAllWorkflows(params?: { teamId?: string; isActive?: boolean }) {
    return this.prisma.workflow.findMany({
      where: {
        teamId: params?.teamId || undefined,
        isActive: params?.isActive !== undefined ? params.isActive : undefined,
      },
      include: {
        creator: true,
        team: true,
        _count: {
          select: {
            runs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneWorkflow(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        creator: true,
        team: true,
        runs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async updateWorkflow(
    id: string,
    data: {
      name?: string;
      description?: string;
      trigger?: string;
      conditions?: any;
      actions?: any[];
      isActive?: boolean;
    },
  ) {
    return this.prisma.workflow.update({
      where: { id },
      data,
    });
  }

  async deleteWorkflow(id: string, userId: string) {
    await this.prisma.workflow.delete({
      where: { id },
    });

    await this.auditService.log({
      action: 'delete',
      entity: 'workflow',
      entityId: id,
      userId,
    });
  }

  // Workflow Execution
  async executeWorkflow(workflowId: string, input: any, userId?: string) {
    const workflow = await this.findOneWorkflow(workflowId);

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    // Check conditions
    if (
      workflow.conditions &&
      !this.checkConditions(workflow.conditions, input)
    ) {
      return {
        success: false,
        reason: 'Conditions not met',
      };
    }

    // Create workflow run
    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId,
        userId,
        status: 'running',
        input,
      },
    });

    try {
      // Execute actions
      const actions = Array.isArray(workflow.actions) ? workflow.actions : [];
      const output = await this.executeActions(actions, input, workflow);

      // Update run as completed
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          output,
          completedAt: new Date(),
        },
      });

      return { success: true, runId: run.id, output };
    } catch (error) {
      // Update run as failed
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  // Trigger workflow by event
  async triggerWorkflow(eventType: string, eventData: any) {
    // Find all active workflows that match this trigger
    const workflows = await this.prisma.workflow.findMany({
      where: {
        trigger: eventType,
        isActive: true,
      },
    });

    const results: any[] = [];

    for (const workflow of workflows) {
      try {
        const result = await this.executeWorkflow(workflow.id, eventData);
        results.push({ workflowId: workflow.id, ...result });
      } catch (error: any) {
        results.push({
          workflowId: workflow.id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // Helper: Check conditions
  private checkConditions(conditions: any, input: any): boolean {
    // Simple condition checking
    // In production, use a more robust condition engine
    if (!conditions) return true;

    // Example: { field: 'status', operator: 'equals', value: 'completed' }
    if (
      conditions.field &&
      conditions.operator &&
      conditions.value !== undefined
    ) {
      const fieldValue = this.getNestedValue(input, conditions.field);

      switch (conditions.operator) {
        case 'equals':
          return fieldValue === conditions.value;
        case 'not_equals':
          return fieldValue !== conditions.value;
        case 'contains':
          return String(fieldValue).includes(conditions.value);
        case 'greater_than':
          return Number(fieldValue) > Number(conditions.value);
        case 'less_than':
          return Number(fieldValue) < Number(conditions.value);
        default:
          return true;
      }
    }

    return true;
  }

  // Helper: Execute actions
  private async executeActions(actions: any[], input: any, workflow: any) {
    const output: any[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, input, workflow);
        output.push({ action: action.type, success: true, result });
      } catch (error) {
        output.push({
          action: action.type,
          success: false,
          error: error.message,
        });
      }
    }

    return output;
  }

  // Helper: Execute single action
  private async executeAction(action: any, input: any, workflow: any) {
    switch (action.type) {
      case 'create_task':
        return await this.tasksService.create({
          title: this.interpolate(action.title, input),
          description: this.interpolate(action.description || '', input),
          priority: action.priority || 'medium',
          assigneeId: action.assigneeId || input.assigneeId,
          teamId: workflow.teamId || input.teamId,
        });

      case 'create_meeting':
        return await this.meetingsService.create({
          title: this.interpolate(action.title, input),
          description: this.interpolate(action.description || '', input),
          startTime: action.startTime || new Date(),
          endTime: action.endTime || new Date(),
          hostId: action.hostId || input.userId,
          teamId: workflow.teamId || input.teamId,
        });

      case 'send_notification':
        if (action.userId) {
          await this.notificationsService.create({
            userId: action.userId,
            type: action.notificationType || 'workflow',
            title: this.interpolate(action.title, input),
            message: this.interpolate(action.message, input),
            relatedId: input.id,
            relatedType: input.type,
          });
        }
        return { success: true };

      case 'update_task':
        if (input.taskId) {
          return await this.tasksService.update(input.taskId, {
            status: action.status,
            ...action.updates,
          });
        }
        return { success: false, error: 'No taskId in input' };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Helper: Interpolate variables in strings
  private interpolate(template: string, data: any): string {
    if (!template) return '';

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key);
      return value !== undefined ? String(value) : match;
    });
  }

  // Helper: Get nested value from object
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Get workflow runs
  async getWorkflowRuns(
    workflowId: string,
    params?: {
      status?: string;
      limit?: number;
    },
  ) {
    return this.prisma.workflowRun.findMany({
      where: {
        workflowId,
        status: params?.status || undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: params?.limit || 50,
    });
  }
}
