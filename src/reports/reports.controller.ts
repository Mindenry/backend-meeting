import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
} from '../common/decorators/swagger.decorators';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getUserReport(
    @Query('range') range: string = 'month',
    @Request() req: any,
  ) {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const userReport = await this.reportsService.getUserActivityReport(
      req.user.id,
      startDate,
      endDate,
    );

    // Get team metrics
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId: req.user.id },
      include: { team: true },
    });
    const teams = memberships.map((m) => m.team);

    const teamMetrics = await Promise.all(
      teams.map(async (team) => {
        try {
          const teamReport =
            await this.reportsService.getTeamProductivityReport(
              team.id,
              startDate,
              endDate,
            );
          return {
            teamName: team.name,
            tasksCompleted: teamReport.summary?.tasks?.completed || 0,
            meetingsAttended: teamReport.summary?.meetings?.completed || 0,
            messagesSent:
              teamReport.members?.find((m) => m.user?.id === req.user.id)
                ?.messagesSent || 0,
          };
        } catch (error) {
          // If team report fails, return empty metrics
          console.error(`Failed to get report for team ${team.id}:`, error);
          return {
            teamName: team.name,
            tasksCompleted: 0,
            meetingsAttended: 0,
            messagesSent: 0,
          };
        }
      }),
    );

    // Calculate productivity score (simple calculation based on completion rate rather than hours)
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

  @Get('team-productivity')
  getTeamProductivityReport(
    @Query('teamId') teamId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getTeamProductivityReport(
      teamId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('user-activity')
  getUserActivityReport(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getUserActivityReport(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('meeting-analytics')
  getMeetingAnalytics(@Query('meetingId') meetingId: string) {
    return this.reportsService.getMeetingAnalytics(meetingId);
  }

  @Get('meetings')
  async getMeetingReport(
    @Query('organizationId') organizationId?: string,
    @Query('teamId') teamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getMeetingReport({
      organizationId,
      teamId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('tasks')
  async getTaskReport(
    @Query('organizationId') organizationId?: string,
    @Query('teamId') teamId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTaskReport({
      organizationId,
      teamId,
      assigneeId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('teams/:teamId/workload')
  async getTeamWorkloadReport(
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTeamWorkloadReport(
      teamId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('performance')
  async getPerformanceDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('teamId') teamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getPerformanceDashboard({
      organizationId,
      teamId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('work-hours')
  async createWorkHours(
    @Body()
    data: {
      userId: string;
      date: string;
      hours: number;
      notes?: string;
      teamId?: string;
    },
  ) {
    return this.reportsService.createWorkHours({
      ...data,
      date: new Date(data.date),
    });
  }
}
