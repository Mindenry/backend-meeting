import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post()
  createTimeEntry(
    @Body()
    body: {
      userId: string;
      taskId?: string;
      meetingId?: string;
      description?: string;
      startTime: string;
      endTime?: string;
      duration?: number;
      billable?: boolean;
      tags?: string[];
    },
  ) {
    return this.timeTrackingService.createTimeEntry({
      ...body,
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    });
  }

  @Get()
  getTimeEntries(
    @Query('userId') userId?: string,
    @Query('taskId') taskId?: string,
    @Query('meetingId') meetingId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeTrackingService.getTimeEntries({
      userId,
      taskId,
      meetingId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('report')
  getTimeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.timeTrackingService.getTimeReport({
      userId,
      teamId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  @Get(':id')
  getTimeEntry(@Param('id') id: string) {
    return this.timeTrackingService.getTimeEntry(id);
  }

  @Patch(':id')
  updateTimeEntry(
    @Param('id') id: string,
    @Body()
    body: {
      description?: string;
      startTime?: string;
      endTime?: string;
      duration?: number;
      billable?: boolean;
      tags?: string[];
      userId: string;
    },
  ) {
    const { userId, ...data } = body;
    return this.timeTrackingService.updateTimeEntry(
      id,
      {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
      userId,
    );
  }

  @Delete(':id')
  deleteTimeEntry(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.timeTrackingService.deleteTimeEntry(id, body.userId);
  }
}
