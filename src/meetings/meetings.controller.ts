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
  BadRequestException,
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
  findAll(@Request() req: any, @Query('status') status?: string, @Query('teamId') teamId?: string) {
    return this.meetingsService.findAll({ status, teamId, user: req.user });
  }

  // IMPORTANT: This route must come BEFORE @Get(':id') to avoid route collision
  // When requesting /meetings/code/ABC123, NestJS matches routes in order
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.meetingsService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Post('quick-huddle')
  @ApiOperation({
    summary: 'Create a Quick Huddle meeting',
    description: 'Create an instant meeting with shareable meeting code',
  })
  @ApiResponse({ status: 201, description: 'Quick Huddle created successfully' })
  createQuickHuddle(@Request() req: any) {
    const userId = req.user.id;
    const userName = req.user.name || 'Host';
    return this.meetingsService.createQuickHuddle(userId, userName);
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
    @Body() body: { userId?: string; role?: string },
    @Request() req: any,
  ) {
    const userId = (req?.user?.id as string | undefined) || body.userId;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.meetingsService.joinMeeting(meetingId, userId, body.role);
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

  @Post(':id/start')
  startMeeting(@Param('id') id: string) {
    return this.meetingsService.startMeeting(id);
  }

  @Post(':id/end')
  endMeeting(@Param('id') id: string) {
    return this.meetingsService.endMeeting(id);
  }
}
