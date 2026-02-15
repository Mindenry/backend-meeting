import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
