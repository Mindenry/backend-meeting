import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { MeetingParticipantsService } from './meeting-participants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('meetings/:meetingId/participants')
@UseGuards(JwtAuthGuard)
export class MeetingParticipantsController {
  constructor(
    private readonly participantsService: MeetingParticipantsService,
  ) {}

  @Post()
  async joinMeeting(
    @Param('meetingId') meetingId: string,
    @Body()
    body: { userId: string },
  ) {
    try {
      if (!body.userId) {
        throw new BadRequestException('userId is required');
      }
      return await this.participantsService.joinMeeting(meetingId, body.userId);
    } catch (error) {
      console.error('Error joining meeting:', error);
      throw error;
    }
  }

  @Delete(':userId')
  async leaveMeeting(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string,
  ) {
    return this.participantsService.leaveMeeting(meetingId, userId);
  }

  @Get()
  async getParticipants(@Param('meetingId') meetingId: string) {
    try {
      return await this.participantsService.getParticipants(meetingId);
    } catch (error) {
      console.error('Error getting participants:', error);
      throw error;
    }
  }

  @Patch(':userId/status')
  async updateStatus(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string,
    @Body()
    body: {
      handRaised?: boolean;
      isMuted?: boolean;
      isVideoOn?: boolean;
      isSharing?: boolean;
    },
  ) {
    return this.participantsService.updateParticipantStatus(
      meetingId,
      userId,
      body,
    );
  }

  @Post(':userId/remove')
  async removeParticipantPost(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string,
    @Body() body: { hostId: string },
  ) {
    return this.participantsService.removeParticipant(
      meetingId,
      userId,
      body.hostId,
    );
  }

  @Delete(':userId/remove')
  async removeParticipant(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string,
    @Body() body: { hostId: string },
  ) {
    return this.participantsService.removeParticipant(
      meetingId,
      userId,
      body.hostId,
    );
  }
}
