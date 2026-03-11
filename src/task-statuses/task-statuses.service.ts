import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_STATUSES = [
  {
    key: 'todo',
    name: 'To Do',
    color: '#94a3b8',
    category: 'todo',
    position: 0,
  },
  {
    key: 'in_progress',
    name: 'In Progress',
    color: '#3b82f6',
    category: 'doing',
    position: 1,
  },
  {
    key: 'in_review',
    name: 'In Review',
    color: '#f59e0b',
    category: 'doing',
    position: 2,
  },
  {
    key: 'done',
    name: 'Done',
    color: '#10b981',
    category: 'done',
    position: 3,
  },
];

@Injectable()
export class TaskStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get statuses for a team. Falls back to global defaults (teamId=null).
   * If no statuses exist at all, seeds and returns defaults.
   */
  async findAll(teamId?: string) {
    // Try team-specific first
    if (teamId) {
      const teamStatuses = await this.prisma.taskWorkflowStatus.findMany({
        where: { teamId },
        orderBy: { position: 'asc' },
      });
      if (teamStatuses.length > 0) return teamStatuses;
    }

    // Fall back to global defaults
    let globalStatuses = await this.prisma.taskWorkflowStatus.findMany({
      where: { teamId: null },
      orderBy: { position: 'asc' },
    });

    // Seed if empty
    if (globalStatuses.length === 0) {
      await this.seedDefaults();
      globalStatuses = await this.prisma.taskWorkflowStatus.findMany({
        where: { teamId: null },
        orderBy: { position: 'asc' },
      });
    }

    return globalStatuses;
  }

  async findOne(id: string) {
    return this.prisma.taskWorkflowStatus.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    key: string;
    color?: string;
    category?: string;
    position?: number;
    teamId?: string;
  }) {
    // If position not specified, put at end
    if (data.position === undefined) {
      const count = await this.prisma.taskWorkflowStatus.count({
        where: { teamId: data.teamId ?? null },
      });
      data.position = count;
    }

    return this.prisma.taskWorkflowStatus.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      color?: string;
      category?: string;
      position?: number;
    },
  ) {
    return this.prisma.taskWorkflowStatus.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Check if any tasks use this status
    const status = await this.prisma.taskWorkflowStatus.findUnique({
      where: { id },
    });
    if (status) {
      const taskCount = await this.prisma.task.count({
        where: { status: status.key },
      });
      if (taskCount > 0) {
        throw new Error(
          `Cannot delete status "${status.name}": ${taskCount} task(s) are using it. Move them first.`,
        );
      }
    }

    return this.prisma.taskWorkflowStatus.delete({ where: { id } });
  }

  async reorder(statusIds: string[]) {
    const updates = statusIds.map((id, index) =>
      this.prisma.taskWorkflowStatus.update({
        where: { id },
        data: { position: index },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  async seedDefaults(teamId?: string) {
    const existing = await this.prisma.taskWorkflowStatus.count({
      where: { teamId: teamId ?? null },
    });
    if (existing > 0) return;

    await this.prisma.taskWorkflowStatus.createMany({
      data: DEFAULT_STATUSES.map((s) => ({ ...s, teamId: teamId ?? null })),
    });
  }
}
