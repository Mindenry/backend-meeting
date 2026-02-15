import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) { }

  async getTeamProductivityReport(teamId: string, startDate: Date, endDate: Date) {
    // Check if team exists
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Get team members
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    // Get tasks
    const tasks = await this.prisma.task.findMany({
      where: {
        teamId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        assignee: true,
        timeEntries: true,
      },
    });

    // Get meetings
    const meetings = await this.prisma.meeting.findMany({
      where: {
        teamId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        host: true,
        participants: {
          include: {
            user: true,
          },
        },
        recordings: true,
        minutes: true,
      },
    });

    // Calculate statistics
    const taskStats = {
      total: tasks.length,
      byStatus: tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
    };

    const meetingStats = {
      total: meetings.length,
      completed: meetings.filter(m => m.status === 'ended').length,
      scheduled: meetings.filter(m => m.status === 'scheduled').length,
      totalDuration: meetings.reduce((sum, m) => {
        const duration = new Date(m.endTime).getTime() - new Date(m.startTime).getTime();
        return sum + duration;
      }, 0),
      withRecordings: meetings.filter(m => m.recordings.length > 0).length,
      withMinutes: meetings.filter(m => m.minutes.length > 0).length,
    };

    const memberStats = await Promise.all(
      teamMembers.map(async member => {
        const memberTasks = tasks.filter(t => t.assigneeId === member.userId);
        const memberTimeEntries = await this.prisma.timeEntry.findMany({
          where: {
            userId: member.userId,
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        return {
          user: member.user,
          tasks: {
            total: memberTasks.length,
            completed: memberTasks.filter(t => t.status === 'done').length,
            inProgress: memberTasks.filter(t => t.status === 'in_progress').length,
          },
          timeTracking: {
            totalHours: memberTimeEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600,
            billableHours:
              memberTimeEntries
                .filter(e => e.billable)
                .reduce((sum, e) => sum + (e.duration || 0), 0) / 3600,
            entries: memberTimeEntries.length,
          },
          meetingsAttended: meetings.filter(m =>
            m.participants.some(p => p.userId === member.userId),
          ).length,
        };
      }),
    );

    return {
      period: { start: startDate, end: endDate },
      team: team,
      summary: {
        members: teamMembers.length,
        tasks: taskStats,
        meetings: meetingStats,
      },
      members: memberStats,
    };
  }

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

  async getUserActivityReport(userId: string, startDate: Date, endDate: Date) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's tasks
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get user's time entries
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        task: true,
      },
    });

    // Get meetings user attended
    const meetings = await this.prisma.meetingParticipant.findMany({
      where: {
        userId,
        joinedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        meeting: {
          include: {
            host: true,
            team: true,
          },
        },
      },
    });

    // Get messages sent
    const messages = await this.prisma.message.findMany({
      where: {
        senderId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      period: { start: startDate, end: endDate },
      user,
      summary: {
        tasks: {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'done').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
        },
        timeTracking: {
          totalHours: timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600,
          billableHours:
            timeEntries
              .filter(e => e.billable)
              .reduce((sum, e) => sum + (e.duration || 0), 0) / 3600,
          entries: timeEntries.length,
        },
        meetings: {
          attended: meetings.length,
          totalDuration: meetings.reduce((sum, m) => {
            const duration = m.duration || 0;
            return sum + duration;
          }, 0),
        },
        messages: messages.length,
      },
      details: {
        tasks,
        timeEntries,
        meetings: meetings.map(m => m.meeting),
        messages,
      },
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

  async getMeetingAnalytics(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        host: true,
        team: true,
        participants: {
          include: {
            user: true,
          },
        },
        recordings: true,
        minutes: true,
        tasks: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const duration = new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime();

    return {
      meeting,
      analytics: {
        duration: {
          minutes: Math.floor(duration / 60000),
          seconds: Math.floor(duration / 1000),
        },
        participants: {
          total: meeting.participants.length,
          averageDuration: meeting.participants.length > 0
            ? meeting.participants.reduce((sum, p) => sum + (p.duration || 0), 0) /
            meeting.participants.length
            : 0,
        },
        recordings: {
          count: meeting.recordings.length,
          totalSize: meeting.recordings.reduce((sum, r) => sum + r.fileSize, 0),
          totalDuration: meeting.recordings.reduce((sum, r) => sum + r.duration, 0),
        },
        followUp: {
          tasksCreated: meeting.tasks.length,
          minutesCreated: meeting.minutes.length,
        },
      },
    };
  }
}
