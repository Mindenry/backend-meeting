import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.meetingsService.findAll({ status, teamId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      password?: string;
      waitingRoom?: boolean;
      allowScreenShare?: boolean;
      status?: string;
      teamId?: string | null;
      hostId: string;
    },
  ) {
    return this.meetingsService.create({
      ...body,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      waitingRoom: boolean;
      allowScreenShare: boolean;
      status: string;
      teamId?: string | null;
    }>,
  ) {
    const { startTime, endTime, ...rest } = body;
    return this.meetingsService.update(id, {
      ...rest,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.meetingsService.remove(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.meetingsService.findByCode(code);
  }

  @Post(':id/start')
  startMeeting(@Param('id') id: string) {
    return this.meetingsService.startMeeting(id);
  }

  @Post(':id/end')
  endMeeting(
    @Param('id') id: string,
    @Body() body: { summary?: string },
  ) {
    return this.meetingsService.endMeeting(id, body.summary);
  }

  @Post(':id/lock')
  lockMeeting(@Param('id') id: string) {
    return this.meetingsService.lockMeeting(id);
  }

  @Post(':id/unlock')
  unlockMeeting(@Param('id') id: string) {
    return this.meetingsService.unlockMeeting(id);
  }

  @Patch(':id/summary')
  updateSummary(
    @Param('id') id: string,
    @Body() body: { summary: string },
  ) {
    return this.meetingsService.updateSummary(id, body.summary);
  }
}


