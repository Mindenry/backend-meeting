import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMeetingReport(params: {
    organizationId?: string;
    teamId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { organizationId, teamId, startDate, endDate } = params;

    const where: any = {
      status: 'ended',
    };

    if (teamId) {
      where.teamId = teamId;
    }

    if (startDate || endDate) {
      where.actualStartTime = {};
      if (startDate) {
        where.actualStartTime.gte = startDate;
      }
      if (endDate) {
        where.actualStartTime.lte = endDate;
      }
    }

    // Get meetings
    const meetings = await this.prisma.meeting.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        actualStartTime: 'desc',
      },
    });

    // Calculate statistics
    const totalMeetings = meetings.length;
    const totalDuration = meetings.reduce((sum, m) => {
      if (m.actualStartTime && m.actualEndTime) {
        const duration = m.actualEndTime.getTime() - m.actualStartTime.getTime();
        return sum + duration;
      }
      return sum;
    }, 0);

    const totalParticipants = meetings.reduce((sum, m) => {
      return sum + m.participants.length;
    }, 0);

    const avgParticipants = totalMeetings > 0 ? totalParticipants / totalMeetings : 0;
    const avgDuration = totalMeetings > 0 ? totalDuration / totalMeetings / 1000 / 60 : 0; // in minutes

    // Meetings by team
    const meetingsByTeam = meetings.reduce((acc, m) => {
      const teamName = m.team?.name || 'No Team';
      acc[teamName] = (acc[teamName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Most active hosts
    const hostStats = meetings.reduce((acc, m) => {
      const hostName = m.host.name;
      acc[hostName] = (acc[hostName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalMeetings,
        totalDuration: totalDuration / 1000 / 60, // minutes
        totalParticipants,
        avgParticipants: Math.round(avgParticipants * 10) / 10,
        avgDuration: Math.round(avgDuration * 10) / 10,
      },
      meetingsByTeam,
      hostStats,
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        startTime: m.actualStartTime,
        endTime: m.actualEndTime,
        duration: m.actualStartTime && m.actualEndTime
          ? (m.actualEndTime.getTime() - m.actualStartTime.getTime()) / 1000 / 60
          : 0,
        host: m.host.name,
        team: m.team?.name,
        participants: m.participants.length,
      })),
    };
  }

  async getTaskReport(params: {
    organizationId?: string;
    teamId?: string;
    assigneeId?: string;
  }) {
    const { teamId, assigneeId } = params;

    const where: any = {};

    if (teamId) {
      where.teamId = teamId;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Statistics
    const totalTasks = tasks.length;
    const tasksByStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByPriority = tasks.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdueTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== 'done';
    });

    const tasksByAssignee = tasks.reduce((acc, t) => {
      const assigneeName = t.assignee?.name || 'Unassigned';
      acc[assigneeName] = (acc[assigneeName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByTeam = tasks.reduce((acc, t) => {
      const teamName = t.team?.name || 'No Team';
      acc[teamName] = (acc[teamName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalTasks,
        overdueTasks: overdueTasks.length,
        completedTasks: tasksByStatus.done || 0,
        inProgressTasks: tasksByStatus.in_progress || 0,
      },
      tasksByStatus,
      tasksByPriority,
      tasksByAssignee,
      tasksByTeam,
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        assignee: t.assignee?.name,
        team: t.team?.name,
        priority: t.priority,
      })),
    };
  }

  async getTeamWorkloadReport(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const tasks = await this.prisma.task.findMany({
      where: { teamId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const workload = team.members.map((member) => {
      const userTasks = tasks.filter((t) => t.assigneeId === member.userId);
      const completed = userTasks.filter((t) => t.status === 'done').length;
      const inProgress = userTasks.filter((t) => t.status === 'in_progress').length;
      const todo = userTasks.filter((t) => t.status === 'todo').length;
      const overdue = userTasks.filter((t) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'done';
      }).length;

      return {
        userId: member.userId,
        userName: member.user.name,
        totalTasks: userTasks.length,
        completed,
        inProgress,
        todo,
        overdue,
      };
    });

    return {
      team: {
        id: team.id,
        name: team.name,
      },
      workload,
    };
  }
}

