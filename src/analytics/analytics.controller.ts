import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('teams/:teamId')
  getTeamAnalytics(
    @Param('teamId') teamId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const dateRange = start && end ? {
      start: new Date(start),
      end: new Date(end),
    } : undefined;

    return this.analyticsService.getTeamAnalytics(teamId, dateRange);
  }

  @Get('users/:userId')
  getUserMetrics(
    @Param('userId') userId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const dateRange = start && end ? {
      start: new Date(start),
      end: new Date(end),
    } : undefined;

    return this.analyticsService.getUserProductivityMetrics(userId, dateRange);
  }

  @Get('dashboard/:teamId')
  getDashboard(
    @Param('teamId') teamId: string,
    @Request() req?: any,
  ) {
    return this.analyticsService.getDashboardData(teamId, req?.user?.userId);
  }

  @Get('my-metrics')
  getMyMetrics(
    @Request() req: any,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const dateRange = start && end ? {
      start: new Date(start),
      end: new Date(end),
    } : undefined;

    return this.analyticsService.getUserProductivityMetrics(req.user.userId, dateRange);
  }
}
