import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Team Analytics
  async getTeamAnalytics(teamId: string, dateRange?: { start: Date; end: Date }) {
    const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = dateRange?.end || new Date();

    // Get or create analytics record
    const dateKey = new Date(start);
    dateKey.setHours(0, 0, 0, 0);

    let analytics = await this.prisma.teamAnalytics.findUnique({
      where: {
        teamId_date: {
          teamId,
          date: dateKey,
        },
      },
    });

    if (!analytics) {
      // Calculate metrics
      const metrics = await this.calculateTeamMetrics(teamId, start, end);

      analytics = await this.prisma.teamAnalytics.create({
        data: {
          teamId,
          date: dateKey,
          metrics,
          productivityScore: metrics.productivityScore,
          meetingHours: metrics.meetingHours,
          activeMembers: metrics.activeMembers,
        },
      });
    }

    return analytics;
  }

  private async calculateTeamMetrics(teamId: string, start: Date, end: Date) {
    // Count meetings
    const meetings = await this.prisma.meeting.count({
      where: {
        teamId,
        startTime: { gte: start, lte: end },
      },
    });

    // Calculate meeting hours
    const meetingDurations = await this.prisma.meeting.findMany({
      where: {
        teamId,
        startTime: { gte: start, lte: end },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const meetingHours = meetingDurations.reduce((total, meeting) => {
      if (!meeting.endTime) return total;
      const duration = (meeting.endTime.getTime() - meeting.startTime.getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);

    // Count completed tasks
    const tasksCompleted = await this.prisma.task.count({
      where: {
        teamId,
        status: 'done',
        updatedAt: { gte: start, lte: end },
      },
    });

    // Count code commits
    const repositories = await this.prisma.repository.findMany({
      where: { teamId },
      select: { id: true },
    });

    const repoIds = repositories.map(r => r.id);
    const codeCommits = await this.prisma.commit.count({
      where: {
        repositoryId: { in: repoIds },
        createdAt: { gte: start, lte: end },
      },
    });

    // Count messages
    const channels = await this.prisma.channel.findMany({
      where: { teamId },
      select: { id: true },
    });

    const channelIds = channels.map(c => c.id);
    const messagesSent = await this.prisma.message.count({
      where: {
        channelId: { in: channelIds },
        createdAt: { gte: start, lte: end },
      },
    });

    // Active members
    const activeMembers = await this.prisma.teamMember.count({
      where: {
        teamId,
        user: {
          timeEntries: {
            some: {
              startTime: { gte: start, lte: end },
            },
          },
        },
      },
    });

    // Calculate productivity score (0-100)
    const productivityScore = this.calculateProductivityScore({
      tasksCompleted,
      codeCommits,
      messagesSent,
      meetingHours,
    });

    return {
      meetings,
      meetingHours: Math.round(meetingHours * 100) / 100,
      tasksCompleted,
      codeCommits,
      messagesSent,
      activeMembers,
      productivityScore,
    };
  }

  private calculateProductivityScore(metrics: {
    tasksCompleted: number;
    codeCommits: number;
    messagesSent: number;
    meetingHours: number;
  }): number {
    // Simple scoring algorithm
    // In production, use more sophisticated metrics
    let score = 0;

    // Tasks (max 30 points)
    score += Math.min(metrics.tasksCompleted * 2, 30);

    // Commits (max 25 points)
    score += Math.min(metrics.codeCommits * 1.5, 25);

    // Messages (max 20 points)
    score += Math.min(metrics.messagesSent * 0.1, 20);

    // Meeting efficiency (max 25 points)
    // Less meeting hours = more productive (inverse relationship)
    const meetingEfficiency = Math.max(0, 25 - metrics.meetingHours * 2);
    score += meetingEfficiency;

    return Math.min(Math.round(score), 100);
  }

  // User Productivity Metrics
  async getUserProductivityMetrics(userId: string, dateRange?: { start: Date; end: Date }) {
    const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = dateRange?.end || new Date();
    const dateKey = new Date(start);
    dateKey.setHours(0, 0, 0, 0);

    let metrics = await this.prisma.productivityMetrics.findUnique({
      where: {
        userId_date: {
          userId,
          date: dateKey,
        },
      },
    });

    if (!metrics) {
      // Calculate metrics
      const calculated = await this.calculateUserMetrics(userId, start, end);

      metrics = await this.prisma.productivityMetrics.create({
        data: {
          userId,
          date: dateKey,
          ...calculated,
        },
      });
    }

    return metrics;
  }

  private async calculateUserMetrics(userId: string, start: Date, end: Date) {
    const tasksCompleted = await this.prisma.task.count({
      where: {
        assigneeId: userId,
        status: 'done',
        updatedAt: { gte: start, lte: end },
      },
    });

    const meetingsAttended = await this.prisma.meetingParticipant.count({
      where: {
        userId,
        joinedAt: { gte: start, lte: end },
      },
    });

    const codeCommits = await this.prisma.commit.count({
      where: {
        authorId: userId,
        createdAt: { gte: start, lte: end },
      },
    });

    const messagesSent = await this.prisma.message.count({
      where: {
        senderId: userId,
        createdAt: { gte: start, lte: end },
      },
    });

    // Calculate hours worked from time entries
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: { gte: start, lte: end },
      },
      select: {
        duration: true,
      },
    });

    const hoursWorked = timeEntries.reduce((total, entry) => {
      return total + (entry.duration || 0) / 3600; // Convert seconds to hours
    }, 0);

    return {
      tasksCompleted,
      meetingsAttended,
      codeCommits,
      messagesSent,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    };
  }

  // Dashboard Data
  async getDashboardData(teamId: string, userId?: string) {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [teamAnalytics, userMetrics, recentActivity] = await Promise.all([
      this.getTeamAnalytics(teamId, { start: last30Days, end: now }),
      userId ? this.getUserProductivityMetrics(userId, { start: last30Days, end: now }) : null,
      this.getRecentActivity(teamId, last7Days),
    ]);

    return {
      team: teamAnalytics,
      user: userMetrics,
      recentActivity,
    };
  }

  private async getRecentActivity(teamId: string, since: Date) {
    const [tasks, meetings, commits, messages] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          teamId,
          updatedAt: { gte: since },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          assignee: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.meeting.findMany({
        where: {
          teamId,
          startTime: { gte: since },
        },
        take: 10,
        orderBy: { startTime: 'desc' },
        include: {
          host: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.commit.findMany({
        where: {
          repository: { teamId },
          createdAt: { gte: since },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true },
          },
          repository: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.message.findMany({
        where: {
          channel: { teamId },
          createdAt: { gte: since },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      tasks,
      meetings,
      commits,
      messages,
    };
  }
}
