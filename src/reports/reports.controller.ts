<<<<<<< HEAD
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
=======
import {
  Controller,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
  ) {
    return this.reportsService.getTaskReport({
      organizationId,
      teamId,
      assigneeId,
    });
  }

  @Get('teams/:teamId/workload')
  async getTeamWorkloadReport(@Param('teamId') teamId: string) {
    return this.reportsService.getTeamWorkloadReport(teamId);
  }
}

>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700
