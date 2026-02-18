import {
  Controller,
  Get,
  Post,
  Body,
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

  @Post('peer-feedback')
  async createPeerFeedback(
    @Body() data: {
      giverId: string;
      receiverId: string;
      rating: number;
      comment?: string;
      category?: string;
      teamId?: string;
    },
  ) {
    return this.reportsService.createPeerFeedback(data);
  }

  @Post('work-hours')
  async createWorkHours(
    @Body() data: {
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

