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

  async getPerformanceDashboard(params: {
    organizationId?: string;
    teamId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { organizationId, teamId, startDate, endDate } = params;

    // Default to last 30 days if no dates provided
    const defaultStartDate = startDate || new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultEndDate = endDate || new Date();

    // Get all users in the organization/team
    const userWhere: any = {};
    if (organizationId) {
      userWhere.organizationId = organizationId;
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    // Filter users by team if specified
    let teamUserIds = users.map(u => u.id);
    if (teamId) {
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true },
      });
      teamUserIds = teamMembers.map(tm => tm.userId);
    }

    const filteredUsers = users.filter(u => teamUserIds.includes(u.id));

    // 1. Task completion rate per person
    const taskCompletionRates = await Promise.all(
      filteredUsers.map(async (user) => {
        const tasksWhere: any = {
          assigneeId: user.id,
          createdAt: {
            gte: defaultStartDate,
            lte: defaultEndDate,
          },
        };

        const allTasks = await this.prisma.task.count({
          where: tasksWhere,
        });

        const completedTasks = await this.prisma.task.count({
          where: {
            ...tasksWhere,
            status: 'done',
          },
        });

        const completionRate = allTasks > 0 ? (completedTasks / allTasks) * 100 : 0;

        return {
          userId: user.id,
          userName: user.name,
          totalTasks: allTasks,
          completedTasks,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      })
    );

    // 2. Meeting attendance rate
    const meetingAttendanceRates = await Promise.all(
      filteredUsers.map(async (user) => {
        const meetingsWhere: any = {
          status: 'ended',
          actualStartTime: {
            gte: defaultStartDate,
            lte: defaultEndDate,
          },
        };

        if (teamId) {
          meetingsWhere.teamId = teamId;
        }

        const allMeetings = await this.prisma.meeting.findMany({
          where: meetingsWhere,
          select: { id: true },
        });

        const meetingIds = allMeetings.map(m => m.id);
        const attendedMeetings = await this.prisma.meetingParticipant.count({
          where: {
            userId: user.id,
            meetingId: { in: meetingIds },
            leftAt: { not: null }, // Must have left (attended)
          },
        });

        const attendanceRate = meetingIds.length > 0
          ? (attendedMeetings / meetingIds.length) * 100
          : 0;

        return {
          userId: user.id,
          userName: user.name,
          totalMeetings: meetingIds.length,
          attendedMeetings,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
        };
      })
    );

    // 3. Response time in chat (average time to read messages)
    const chatResponseTimes = await Promise.all(
      filteredUsers.map(async (user) => {
        // Get messages in channels where user is a team member
        const channelsWhere: any = {};
        if (teamId) {
          channelsWhere.teamId = teamId;
        }

        const channels = await this.prisma.channel.findMany({
          where: channelsWhere,
          select: { id: true },
        });

        const channelIds = channels.map(c => c.id);

        // Get messages that mention the user or are in their channels
        const messages = await this.prisma.message.findMany({
          where: {
            channelId: { in: channelIds },
            createdAt: {
              gte: defaultStartDate,
              lte: defaultEndDate,
            },
            senderId: { not: user.id }, // Not sent by the user
          },
          include: {
            reads: {
              where: { userId: user.id },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        const responseTimes: number[] = [];
        for (const message of messages) {
          const read = message.reads[0];
          if (read) {
            const responseTime = read.readAt.getTime() - message.createdAt.getTime();
            if (responseTime > 0 && responseTime < 7 * 24 * 60 * 60 * 1000) { // Less than 7 days
              responseTimes.push(responseTime);
            }
          }
        }

        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : null;

        return {
          userId: user.id,
          userName: user.name,
          totalMessages: messages.length,
          respondedMessages: responseTimes.length,
          avgResponseTimeMinutes: avgResponseTime
            ? Math.round(avgResponseTime / 1000 / 60 * 10) / 10
            : null,
          avgResponseTimeHours: avgResponseTime
            ? Math.round((avgResponseTime / 1000 / 60 / 60) * 10) / 10
            : null,
        };
      })
    );

    // 4. Working hours vs output
    const workHoursVsOutput = await Promise.all(
      filteredUsers.map(async (user) => {
        const workHoursWhere: any = {
          userId: user.id,
          date: {
            gte: defaultStartDate,
            lte: defaultEndDate,
          },
        };

        if (teamId) {
          workHoursWhere.teamId = teamId;
        }

        const workHoursRecords = await this.prisma.workHours.findMany({
          where: workHoursWhere,
        });

        const totalHours = workHoursRecords.reduce((sum, wh) => sum + wh.hours, 0);

        // Output = completed tasks
        const completedTasks = await this.prisma.task.count({
          where: {
            assigneeId: user.id,
            status: 'done',
            updatedAt: {
              gte: defaultStartDate,
              lte: defaultEndDate,
            },
          },
        });

        const outputPerHour = totalHours > 0 ? completedTasks / totalHours : 0;

        return {
          userId: user.id,
          userName: user.name,
          totalHours: Math.round(totalHours * 10) / 10,
          completedTasks,
          outputPerHour: Math.round(outputPerHour * 100) / 100,
        };
      })
    );

    // 5. Peer feedback/rating system
    const peerFeedbacks = await Promise.all(
      filteredUsers.map(async (user) => {
        const feedbackWhere: any = {
          receiverId: user.id,
          createdAt: {
            gte: defaultStartDate,
            lte: defaultEndDate,
          },
        };

        if (teamId) {
          feedbackWhere.teamId = teamId;
        }

        const feedbacks = await this.prisma.peerFeedback.findMany({
          where: feedbackWhere,
          include: {
            giver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        const avgRating = feedbacks.length > 0
          ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
          : 0;

        const ratingsByCategory = feedbacks.reduce((acc, f) => {
          if (!acc[f.category]) {
            acc[f.category] = { total: 0, sum: 0 };
          }
          acc[f.category].total += 1;
          acc[f.category].sum += f.rating;
          return acc;
        }, {} as Record<string, { total: number; sum: number }>);

        return {
          userId: user.id,
          userName: user.name,
          totalFeedbacks: feedbacks.length,
          avgRating: Math.round(avgRating * 10) / 10,
          ratingsByCategory: (
            Object.entries(ratingsByCategory) as Array<[string, { total: number; sum: number }]>
          ).map(([category, data]) => ({
            category,
            avgRating: Math.round((data.sum / data.total) * 10) / 10,
            count: data.total,
          })),
          recentFeedbacks: feedbacks.slice(-5).map(f => ({
            id: f.id,
            rating: f.rating,
            comment: f.comment,
            category: f.category,
            giverName: f.giver.name,
            createdAt: f.createdAt,
          })),
        };
      })
    );

    return {
      period: {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
      },
      taskCompletionRates,
      meetingAttendanceRates,
      chatResponseTimes,
      workHoursVsOutput,
      peerFeedbacks,
    };
  }

  async createPeerFeedback(data: {
    giverId: string;
    receiverId: string;
    rating: number;
    comment?: string;
    category?: string;
    teamId?: string;
  }) {
    return this.prisma.peerFeedback.create({
      data: {
        giverId: data.giverId,
        receiverId: data.receiverId,
        rating: data.rating,
        comment: data.comment,
        category: data.category || 'general',
        teamId: data.teamId,
      },
      include: {
        giver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async createWorkHours(data: {
    userId: string;
    date: Date;
    hours: number;
    notes?: string;
    teamId?: string;
  }) {
    // Use upsert to update if exists for the same date
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
}

