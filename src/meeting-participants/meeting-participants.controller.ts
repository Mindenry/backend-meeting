import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { MeetingParticipantsService } from './meeting-participants.service';

@Controller('meetings/:meetingId/participants')
export class MeetingParticipantsController {
  constructor(
    private readonly participantsService: MeetingParticipantsService,
  ) {}

  @Post()
  async joinMeeting(
    @Param('meetingId') meetingId: string,
    @Body() body: { userId: string; skipWaitingRoom?: boolean },
  ) {
    return this.participantsService.joinMeeting(
      meetingId,
      body.userId,
      body.skipWaitingRoom,
    );
  }

  @Delete(':userId')
  async leaveMeeting(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string,
  ) {
    return this.participantsService.leaveMeeting(meetingId, userId);
  }

  @Get()
  async getParticipants(
    @Param('meetingId') meetingId: string,
    @Query('includeWaitingRoom') includeWaitingRoom?: string,
  ) {
    return this.participantsService.getParticipants(
      meetingId,
      includeWaitingRoom === 'true',
    );
  }

  @Get('waiting-room')
  async getWaitingRoom(@Param('meetingId') meetingId: string) {
    return this.participantsService.getWaitingRoom(meetingId);
  }

  @Post(':userId/admit')
  async admitParticipant(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string,
  ) {
    return this.participantsService.admitParticipant(meetingId, userId);
  }

  @Post(':userId/deny')
  async denyParticipant(
    @Param('meetingId') meetingId: string,
    @Param('userId') userId: string,
  ) {
    return this.participantsService.denyParticipant(meetingId, userId);
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

  @Post('mute-all')
  async muteAll(
    @Param('meetingId') meetingId: string,
    @Body() body: { hostId: string },
  ) {
    return this.participantsService.muteAll(meetingId, body.hostId);
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

