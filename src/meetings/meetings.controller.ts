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
  Request,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '../common/decorators/swagger.decorators';

@ApiTags('meetings')
@Controller('meetings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get(':id/livekit-token')
  @ApiOperation({ summary: 'Get LiveKit token' })
  @ApiResponse({
    status: 200,
    description: 'LiveKit token generated successfully',
  })
  getLiveKitToken(@Param('id') id: string, @Request() req) {
    return this.meetingsService.generateLivekitToken(
      id,
      req.user.id,
      req.user.name,
    );
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('teamId') teamId?: string) {
    return this.meetingsService.findAll({ status, teamId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new meeting',
    description: 'Create a new meeting with optional recurring settings',
  })
  @ApiResponse({ status: 201, description: 'Meeting created successfully' })
  create(@Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingsService.create({
      ...createMeetingDto,
      startTime: new Date(createMeetingDto.startTime),
      endTime: new Date(createMeetingDto.endTime),
      recurringEndDate: createMeetingDto.recurringEndDate
        ? new Date(createMeetingDto.recurringEndDate)
        : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a meeting',
    description:
      'Update meeting properties. Only provided fields will be updated.',
  })
  @ApiResponse({ status: 200, description: 'Meeting updated successfully' })
  update(@Param('id') id: string, @Body() updateMeetingDto: UpdateMeetingDto) {
    const { startTime, endTime, ...rest } = updateMeetingDto;
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

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.meetingsService.findByCode(code);
  }

  @Post(':id/start')
  startMeeting(@Param('id') id: string) {
    return this.meetingsService.startMeeting(id);
  }

  @Post(':id/end')
  endMeeting(@Param('id') id: string, @Body() body: { summary?: string }) {
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
}
