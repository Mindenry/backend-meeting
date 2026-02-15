import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
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

  // Participants
  @Post(':id/participants')
  joinMeeting(
    @Param('id') meetingId: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.meetingsService.joinMeeting(meetingId, body.userId, body.role);
  }

  @Get(':id/participants')
  getParticipants(@Param('id') meetingId: string) {
    return this.meetingsService.getParticipants(meetingId);
  }

  @Post(':id/participants/leave')
  leaveMeeting(
    @Param('id') meetingId: string,
    @Body() body: { userId: string },
  ) {
    return this.meetingsService.leaveMeeting(meetingId, body.userId);
  }
}


