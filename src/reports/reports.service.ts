import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CurrentUser {
  id: string;
  role: string;
  organizationId: string;
}

type DateRangeKey = 'week' | 'month' | 'quarter' | 'year';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private isPrivileged(user: CurrentUser): boolean {
    const role = String(user?.role || '').toLowerCase();
    return role === 'org_owner' || role === 'admin' || role === 'manager';
  }

  private async ensureTeamAccess(teamId: string, currentUser: CurrentUser) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    if (team.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException('Team not in your organization');
    }

    if (this.isPrivileged(currentUser)) return team;

    const membership = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: currentUser.id },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this team');
    }

    return team;
  }

  private enforceOrganizationScope(
    requestedOrganizationId: string | undefined,
    currentUser: CurrentUser,
  ): string {
    if (requestedOrganizationId) {
      if (requestedOrganizationId !== currentUser.organizationId) {
        throw new ForbiddenException('Cannot access another organization');
      }
      return requestedOrganizationId;
    }
    return currentUser.organizationId;
  }

  private resolveDateRange(
    range: DateRangeKey = 'month',
    startDate?: Date,
    endDate?: Date,
  ) {
    if (startDate || endDate) {
      return {
        startDate: startDate ?? new Date(),
        endDate: endDate ?? new Date(),
      };
    }

    const resolvedEndDate = new Date();
    const resolvedStartDate = new Date();

    switch (range) {
      case 'week':
        resolvedStartDate.setDate(resolvedStartDate.getDate() - 7);
        break;
      case 'month':
        resolvedStartDate.setMonth(resolvedStartDate.getMonth() - 1);
        break;
      case 'quarter':
        resolvedStartDate.setMonth(resolvedStartDate.getMonth() - 3);
        break;
      case 'year':
        resolvedStartDate.setFullYear(resolvedStartDate.getFullYear() - 1);
        break;
    }

    return {
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
    };
  }

  async getOverviewReport(
    currentUser: CurrentUser,
    range: DateRangeKey = 'month',
  ) {
    const { startDate, endDate } = this.resolveDateRange(range);

    const userReport = await this.getUserActivityReport(
      currentUser.id,
      startDate,
      endDate,
      currentUser,
    );

    const teamMetrics = await this.getUserTeamMetrics(
      currentUser.id,
      startDate,
      endDate,
      currentUser,
    );

    const tasksCompleted = userReport.summary?.tasks?.completed || 0;
    const tasksTotal = userReport.summary?.tasks?.total || 0;
    const messagesSent = userReport.summary?.messagesSent || 0;
    const productivityScore =
      tasksTotal > 0
        ? Math.min(100, (tasksCompleted / tasksTotal) * 100)
        : messagesSent > 0
          ? 100
          : 0;

    return {
      tasksCompleted,
      meetingsAttended: userReport.summary?.meetings?.attended || 0,
      messagesSent,
      productivityScore,
      teamMetrics,
    };
  }

  async getUserTeamMetrics(
    userId: string,
    startDate: Date,
    endDate: Date,
    currentUser: CurrentUser,
  ) {
    if (!this.isPrivileged(currentUser) && currentUser.id !== userId) {
      throw new ForbiddenException('Cannot access another user report');
    }

    const memberships = await this.prisma.teamMember.findMany({
      where: {
        userId,
        team: { organizationId: currentUser.organizationId },
      },
      include: { team: true },
    });

    return Promise.all(
      memberships.map(async (membership) => {
        const teamId = membership.teamId;
        const [tasksCompleted, meetingsAttended, messagesSent] =
          await Promise.all([
            this.prisma.task.count({
              where: {
                teamId,
                assigneeId: userId,
                status: 'done',
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            this.prisma.meetingParticipant.count({
              where: {
                userId,
                meeting: {
                  teamId,
                  startTime: { gte: startDate, lte: endDate },
                },
              },
            }),
            this.prisma.message.count({
              where: {
                senderId: userId,
                channel: { teamId },
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
          ]);

        return {
          teamName: membership.team.name,
          tasksCompleted,
          meetingsAttended,
          messagesSent,
        };
      }),
    );
  }

  async getTeamProductivityReport(
    teamId: string,
    startDate: Date,
    endDate: Date,
    currentUser: CurrentUser,
  ) {
    const team = await this.ensureTeamAccess(teamId, currentUser);

    const [teamMembers, tasks, meetings, messages] = await Promise.all([
      this.prisma.teamMember.findMany({
        where: { teamId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.task.findMany({
        where: {
          teamId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.meeting.findMany({
        where: {
          teamId,
          startTime: { gte: startDate, lte: endDate },
        },
        include: {
          participants: { select: { userId: true } },
          recordings: { select: { id: true } },
          minutes: { select: { id: true } },
        },
      }),
      this.prisma.message.findMany({
        where: {
          channel: { teamId },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { senderId: true },
      }),
    ]);

    const taskStats = {
      total: tasks.length,
      byStatus: tasks.reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byPriority: tasks.reduce(
        (acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      completed: tasks.filter((t) => t.status === 'done').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    };

    const meetingStats = {
      total: meetings.length,
      completed: meetings.filter((m) => m.status === 'ended').length,
      scheduled: meetings.filter((m) => m.status === 'scheduled').length,
      totalDuration: meetings.reduce((sum, m) => {
        const endTime = m.endTime
          ? new Date(m.endTime).getTime()
          : new Date(m.startTime).getTime();
        return sum + (endTime - new Date(m.startTime).getTime());
      }, 0),
      withRecordings: meetings.filter((m) => m.recordings.length > 0).length,
      withMinutes: meetings.filter((m) => m.minutes.length > 0).length,
    };

    const memberStats = teamMembers.map((member) => {
      const memberTasks = tasks.filter((t) => t.assigneeId === member.userId);
      return {
        user: member.user,
        tasks: {
          total: memberTasks.length,
          completed: memberTasks.filter((t) => t.status === 'done').length,
          inProgress: memberTasks.filter((t) => t.status === 'in_progress')
            .length,
        },
        messagesSent: messages.filter((m) => m.senderId === member.userId)
          .length,
        meetingsAttended: meetings.filter((m) =>
          m.participants.some((p) => p.userId === member.userId),
        ).length,
      };
    });

    return {
      period: { start: startDate, end: endDate },
      team,
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
    currentUser: CurrentUser;
  }) {
    const { organizationId, teamId, startDate, endDate, currentUser } = params;

    const scopedOrgId = this.enforceOrganizationScope(
      organizationId,
      currentUser,
    );

    if (teamId) await this.ensureTeamAccess(teamId, currentUser);

    const where: any = {
      status: 'ended',
      team: { organizationId: scopedOrgId },
    };

    if (teamId) where.teamId = teamId;

    if (startDate || endDate) {
      where.actualStartTime = {};
      if (startDate) where.actualStartTime.gte = startDate;
      if (endDate) where.actualStartTime.lte = endDate;
    }

    const meetings = await this.prisma.meeting.findMany({
      where,
      include: {
        host: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        participants: { select: { id: true } },
      },
      orderBy: { actualStartTime: 'desc' },
    });

    const totalMeetings = meetings.length;
    const totalDuration = meetings.reduce((sum, m) => {
      if (m.actualStartTime && m.actualEndTime) {
        return sum + (m.actualEndTime.getTime() - m.actualStartTime.getTime());
      }
      return sum;
    }, 0);

    const totalParticipants = meetings.reduce(
      (sum, m) => sum + m.participants.length,
      0,
    );

    const avgParticipants =
      totalMeetings > 0 ? totalParticipants / totalMeetings : 0;
    const avgDuration =
      totalMeetings > 0 ? totalDuration / totalMeetings / 1000 / 60 : 0;

    const meetingsByTeam = meetings.reduce(
      (acc, m) => {
        const teamName = m.team?.name || 'No Team';
        acc[teamName] = (acc[teamName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const hostStats = meetings.reduce(
      (acc, m) => {
        acc[m.host.name] = (acc[m.host.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      summary: {
        totalMeetings,
        totalDuration: totalDuration / 1000 / 60,
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
        duration:
          m.actualStartTime && m.actualEndTime
            ? (m.actualEndTime.getTime() - m.actualStartTime.getTime()) /
              1000 /
              60
            : 0,
        host: m.host.name,
        team: m.team?.name,
        participants: m.participants.length,
      })),
    };
  }

  async getUserActivityReport(
    userId: string,
    startDate: Date,
    endDate: Date,
    currentUser: CurrentUser,
  ) {
    if (!this.isPrivileged(currentUser) && currentUser.id !== userId) {
      throw new ForbiddenException('Cannot access another user report');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: currentUser.organizationId },
    });
    if (!user) throw new NotFoundException('User not found');

    const [tasks, timeEntries, meetings, messages] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          team: { organizationId: currentUser.organizationId },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.timeEntry.findMany({
        where: {
          userId,
          startTime: { gte: startDate, lte: endDate },
          task: { team: { organizationId: currentUser.organizationId } },
        },
        include: { task: true },
      }),
      this.prisma.meetingParticipant.findMany({
        where: {
          userId,
          joinedAt: { gte: startDate, lte: endDate },
          meeting: { team: { organizationId: currentUser.organizationId } },
        },
        include: {
          meeting: { include: { host: true, team: true } },
        },
      }),
      this.prisma.message.findMany({
        where: {
          senderId: userId,
          channel: { team: { organizationId: currentUser.organizationId } },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      period: { start: startDate, end: endDate },
      user,
      summary: {
        tasks: {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === 'done').length,
          inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        },
        messagesSent: messages.length,
        meetings: {
          attended: meetings.length,
          totalDuration: meetings.reduce(
            (sum, m) => sum + (m.duration || 0),
            0,
          ),
        },
      },
      details: {
        tasks,
        timeEntries,
        meetings: meetings.map((m) => m.meeting),
        messages,
      },
    };
  }

  async getTaskReport(params: {
    organizationId?: string;
    teamId?: string;
    assigneeId?: string;
    startDate?: Date;
    endDate?: Date;
    currentUser: CurrentUser;
  }) {
    const {
      organizationId,
      teamId,
      assigneeId,
      startDate,
      endDate,
      currentUser,
    } = params;

    const scopedOrgId = this.enforceOrganizationScope(
      organizationId,
      currentUser,
    );

    if (teamId) await this.ensureTeamAccess(teamId, currentUser);

    const where: any = {
      team: { organizationId: scopedOrgId },
    };

    if (teamId) where.teamId = teamId;
    if (assigneeId) where.assigneeId = assigneeId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    const totalTasks = tasks.length;
    const tasksByStatus = tasks.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const tasksByPriority = tasks.reduce(
      (acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const overdueTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== 'done';
    });

    const tasksByAssignee = tasks.reduce(
      (acc, t) => {
        const assigneeName = t.assignee?.name || 'Unassigned';
        acc[assigneeName] = (acc[assigneeName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const tasksByTeam = tasks.reduce(
      (acc, t) => {
        const teamName = t.team?.name || 'No Team';
        acc[teamName] = (acc[teamName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

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

  async getTeamWorkloadReport(
    teamId: string,
    startDate: Date | undefined,
    endDate: Date | undefined,
    currentUser: CurrentUser,
  ) {
    const team = await this.ensureTeamAccess(teamId, currentUser);

    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const tasksWhere: any = { teamId };
    if (startDate || endDate) {
      tasksWhere.createdAt = {};
      if (startDate) tasksWhere.createdAt.gte = startDate;
      if (endDate) tasksWhere.createdAt.lte = endDate;
    }

    const tasks = await this.prisma.task.findMany({ where: tasksWhere });

    const workload = members.map((member) => {
      const userTasks = tasks.filter((t) => t.assigneeId === member.userId);
      const completed = userTasks.filter((t) => t.status === 'done').length;
      const inProgress = userTasks.filter(
        (t) => t.status === 'in_progress',
      ).length;
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
      team: { id: team.id, name: team.name },
      workload,
    };
  }

  async getPerformanceDashboard(params: {
    organizationId?: string;
    teamId?: string;
    startDate?: Date;
    endDate?: Date;
    currentUser: CurrentUser;
  }) {
    const { organizationId, teamId, startDate, endDate, currentUser } = params;

    const scopedOrgId = this.enforceOrganizationScope(
      organizationId,
      currentUser,
    );

    if (teamId) await this.ensureTeamAccess(teamId, currentUser);

    const defaultStartDate =
      startDate ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
      })();
    const defaultEndDate = endDate ?? new Date();

    const users = await this.prisma.user.findMany({
      where: { organizationId: scopedOrgId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    let scopedUsers = users;
    if (teamId) {
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true },
      });
      const ids = new Set(teamMembers.map((m) => m.userId));
      scopedUsers = users.filter((u) => ids.has(u.id));
    }

    const teamChannelIds = teamId
      ? (
          await this.prisma.channel.findMany({
            where: { teamId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : (
          await this.prisma.channel.findMany({
            where: { team: { organizationId: scopedOrgId } },
            select: { id: true },
          })
        ).map((c) => c.id);

    const meetingsScopeWhere: any = {
      status: 'ended',
      team: { organizationId: scopedOrgId },
      actualStartTime: { gte: defaultStartDate, lte: defaultEndDate },
    };
    if (teamId) meetingsScopeWhere.teamId = teamId;

    const meetings = await this.prisma.meeting.findMany({
      where: meetingsScopeWhere,
      select: { id: true },
    });
    const meetingIds = meetings.map((m) => m.id);

    const taskCompletionRates = await Promise.all(
      scopedUsers.map(async (user) => {
        const tasksWhere: any = {
          assigneeId: user.id,
          team: { organizationId: scopedOrgId },
          createdAt: { gte: defaultStartDate, lte: defaultEndDate },
        };
        if (teamId) tasksWhere.teamId = teamId;

        const [allTasks, completedTasks] = await Promise.all([
          this.prisma.task.count({ where: tasksWhere }),
          this.prisma.task.count({ where: { ...tasksWhere, status: 'done' } }),
        ]);

        const completionRate =
          allTasks > 0 ? (completedTasks / allTasks) * 100 : 0;

        return {
          userId: user.id,
          userName: user.name,
          totalTasks: allTasks,
          completedTasks,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      }),
    );

    const meetingAttendanceRates = await Promise.all(
      scopedUsers.map(async (user) => {
        const attendedMeetings =
          meetingIds.length > 0
            ? await this.prisma.meetingParticipant.count({
                where: {
                  userId: user.id,
                  meetingId: { in: meetingIds },
                  leftAt: { not: null },
                },
              })
            : 0;

        const attendanceRate =
          meetingIds.length > 0
            ? (attendedMeetings / meetingIds.length) * 100
            : 0;

        return {
          userId: user.id,
          userName: user.name,
          totalMeetings: meetingIds.length,
          attendedMeetings,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
        };
      }),
    );

    const collaborationActivity = await Promise.all(
      scopedUsers.map(async (user) => {
        const [completedTasks, attendedMeetings, messagesSent] =
          await Promise.all([
            this.prisma.task.count({
              where: {
                assigneeId: user.id,
                status: 'done',
                team: { organizationId: scopedOrgId },
                ...(teamId ? { teamId } : {}),
                updatedAt: { gte: defaultStartDate, lte: defaultEndDate },
              },
            }),
            meetingIds.length > 0
              ? this.prisma.meetingParticipant.count({
                  where: {
                    userId: user.id,
                    meetingId: { in: meetingIds },
                    leftAt: { not: null },
                  },
                })
              : 0,
            teamChannelIds.length > 0
              ? this.prisma.message.count({
                  where: {
                    senderId: user.id,
                    channelId: { in: teamChannelIds },
                    createdAt: { gte: defaultStartDate, lte: defaultEndDate },
                  },
                })
              : 0,
          ]);

        return {
          userId: user.id,
          userName: user.name,
          completedTasks,
          attendedMeetings,
          messagesSent,
          totalInteractions: completedTasks + attendedMeetings + messagesSent,
        };
      }),
    );

    return {
      period: {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
      },
      taskCompletionRates,
      meetingAttendanceRates,
      collaborationActivity,
    };
  }

  async createWorkHours(
    data: {
      userId: string;
      date: Date;
      hours: number;
      notes?: string;
      teamId?: string;
    },
    currentUser: CurrentUser,
  ) {
    if (!this.isPrivileged(currentUser) && currentUser.id !== data.userId) {
      throw new ForbiddenException('Cannot create work hours for another user');
    }

    if (data.teamId) {
      await this.ensureTeamAccess(data.teamId, currentUser);
    }

    return this.prisma.workHours.upsert({
      where: {
        userId_date: {
          userId: data.userId,
          date: data.date,
        },
      },
      update: {
        hours: data.hours,
        notes: data.notes,
      },
      create: {
        userId: data.userId,
        date: data.date,
        hours: data.hours,
        notes: data.notes,
        teamId: data.teamId,
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

  async getMeetingAnalytics(meetingId: string, currentUser: CurrentUser) {
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

    if (meeting.teamId) {
      await this.ensureTeamAccess(meeting.teamId, currentUser);
    }

    const endTime = meeting.endTime
      ? new Date(meeting.endTime).getTime()
      : new Date(meeting.startTime).getTime();
    const duration = endTime - new Date(meeting.startTime).getTime();

    return {
      meeting,
      analytics: {
        duration: {
          minutes: Math.floor(duration / 60000),
          seconds: Math.floor(duration / 1000),
        },
        participants: {
          total: meeting.participants.length,
          averageDuration:
            meeting.participants.length > 0
              ? meeting.participants.reduce(
                  (sum, p) => sum + (p.duration || 0),
                  0,
                ) / meeting.participants.length
              : 0,
        },
        recordings: {
          count: meeting.recordings.length,
          totalSize: meeting.recordings.reduce((sum, r) => sum + r.fileSize, 0),
          totalDuration: meeting.recordings.reduce(
            (sum, r) => sum + r.duration,
            0,
          ),
        },
        followUp: {
          tasksCreated: meeting.tasks.length,
          minutesCreated: meeting.minutes.length,
        },
      },
    };
  }
}
