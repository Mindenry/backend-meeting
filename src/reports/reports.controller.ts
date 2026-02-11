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

