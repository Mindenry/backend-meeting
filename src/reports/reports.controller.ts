import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
}
