import { Controller, Get, UseGuards, Request } from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from './common/decorators/swagger.decorators';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma/prisma.service';
import { CacheService } from './common/cache/cache.service';

@ApiTags('dashboard')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('api/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get dashboard data',
    description:
      'Returns comprehensive dashboard statistics including meetings, tasks, notifications, and team metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          properties: {
            meetingsToday: { type: 'number' },
            upcomingMeetings: { type: 'number' },
            openTasks: { type: 'number' },
            completedTasks: { type: 'number' },
            unreadNotifications: { type: 'number' },
            unreadMessages: { type: 'number' },
            activeMembers: { type: 'number' },
            taskStats: { type: 'object' },
          },
        },
        meetingsToday: { type: 'array' },
        upcomingMeetings: { type: 'array' },
        recentTasks: { type: 'array' },
        teamStats: { type: 'array' },
        recentActivities: { type: 'array' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(@Request() req: any) {
    try {
      const userId = req.user.id || req.user.userId;
      const organizationId = req.user.organizationId;

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Cache key for user dashboard (5 minute TTL)
      const cacheKey = `dashboard:${userId}`;
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get user's teams (optimized - only select needed fields)
      const teamMemberships = await this.prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true, team: { select: { id: true, name: true } } },
      });
      const teamIds = teamMemberships.map((tm) => tm.teamId);

      // Get today's meetings
      const meetingsToday = await this.prisma.meeting.findMany({
        where: {
          startTime: {
            gte: today,
            lt: tomorrow,
          },
          OR: [
            { hostId: userId },
            { participants: { some: { userId } } },
            ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
          ],
        },
        include: {
          host: { select: { id: true, name: true, avatar: true } },
          team: { select: { id: true, name: true } },
          participants: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      // Get upcoming meetings (next 7 days)
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcomingMeetings = await this.prisma.meeting.findMany({
        where: {
          startTime: {
            gte: tomorrow,
            lt: nextWeek,
          },
          status: 'scheduled',
          OR: [
            { hostId: userId },
            { participants: { some: { userId } } },
            ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
          ],
        },
        include: {
          host: { select: { id: true, name: true, avatar: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 5,
      });

      // Get user's tasks
      const userTasks = await this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { in: ['todo', 'in_progress'] },
        },
        include: {
          team: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true } },
          epic: { select: { id: true, name: true, color: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        take: 10,
      });

      // Get task statistics
      const taskStats = await this.prisma.task.groupBy({
        by: ['status'],
        where: {
          OR: [
            { assigneeId: userId },
            ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
          ],
        },
        _count: true,
      });

      // Get completed tasks count (last 30 days)
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const completedTasksCount = await this.prisma.task.count({
        where: {
          status: 'done',
          updatedAt: { gte: thirtyDaysAgo },
          OR: [
            { assigneeId: userId },
            ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
          ],
        },
      });

      // Get unread notifications count
      const unreadNotificationsCount = await this.prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      });

      // Get unread messages count (channels user has access to)
      // Optimized: Get channel IDs and count in parallel
      const [userChannels, unreadMessagesCount] = await Promise.all([
        teamIds.length > 0
          ? this.prisma.channel.findMany({
              where: { teamId: { in: teamIds } },
              select: { id: true },
            })
          : Promise.resolve([]),
        teamIds.length > 0
          ? this.prisma.message.count({
              where: {
                channel: { teamId: { in: teamIds } },
                createdAt: { gte: thirtyDaysAgo },
                reads: { none: { userId } },
              },
            })
          : Promise.resolve(0),
      ]);

      // Get active team members count
      const activeMembers = await this.prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          status: { in: ['online', 'busy'] },
        },
      });

      // Get recent activity (last 20 activities)
      const recentActivities = await this.prisma.taskActivityLog.findMany({
        where: {
          task: {
            OR: [
              { assigneeId: userId },
              ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
            ],
          },
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      // Get team statistics (optimized - batch queries)
      const teamStats =
        teamIds.length > 0
          ? await Promise.all(
              teamIds.map(async (teamId) => {
                const [totalTasks, completedTasks, activeMembers] =
                  await Promise.all([
                    this.prisma.task.count({ where: { teamId } }),
                    this.prisma.task.count({
                      where: { teamId, status: 'done' },
                    }),
                    this.prisma.teamMember.count({ where: { teamId } }),
                  ]);

                return {
                  teamId,
                  totalTasks,
                  completedTasks,
                  activeMembers,
                };
              }),
            )
          : [];

      const result = {
        stats: {
          meetingsToday: meetingsToday.length,
          upcomingMeetings: upcomingMeetings.length,
          openTasks: userTasks.length,
          completedTasks: completedTasksCount,
          unreadNotifications: unreadNotificationsCount,
          unreadMessages: unreadMessagesCount,
          activeMembers,
          taskStats: taskStats.reduce(
            (acc, stat) => {
              acc[stat.status] = stat._count;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
        meetingsToday,
        upcomingMeetings,
        recentTasks: userTasks,
        teamStats,
        recentActivities: recentActivities.map((activity) => ({
          id: activity.id,
          action: activity.action,
          oldValue: activity.oldValue,
          newValue: activity.newValue,
          createdAt: activity.createdAt,
          task: activity.task,
          user: activity.user,
        })),
      };

      // Cache result for 5 minutes
      await this.cacheService.set(cacheKey, result, 300);

      return result;
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}
