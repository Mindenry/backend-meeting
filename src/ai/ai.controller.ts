import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('meetings/:meetingId/summary')
  generateMeetingSummary(
    @Param('meetingId') meetingId: string,
    @Body() body?: { transcription?: string },
  ) {
    return this.aiService.generateMeetingSummary(meetingId, body?.transcription);
  }

  @Get('meetings/:meetingId/summary')
  getMeetingSummary(@Param('meetingId') meetingId: string) {
    return this.aiService.getAISummary(meetingId, 'meeting');
  }

  @Post('pull-requests/:prId/review')
  generateCodeReview(
    @Param('prId') pullRequestId: string,
    @Body() body?: { codeDiff?: string },
  ) {
    return this.aiService.generateCodeReview(pullRequestId, body?.codeDiff);
  }

  @Post('tasks/:taskId/suggestions')
  generateTaskSuggestions(@Param('taskId') taskId: string) {
    return this.aiService.generateTaskSuggestions(taskId);
  }

  @Post('chat')
  chatAssistant(
    @Body() body: { message: string; context?: any },
    @Request() req: any,
  ) {
    return this.aiService.chatAssistant(req.user.userId, body.message, body.context);
  }

  @Post('documents/generate')
  generateDocument(
    @Body() body: { type: string; context: any },
    @Request() req: any,
  ) {
    return this.aiService.generateDocument(body.type, body.context, req.user.userId);
  }

  @Get('history')
  getHistory(
    @Query('type') type?: string,
    @Request() req?: any,
  ) {
    return this.aiService.getAIHistory(req?.user?.userId, type);
  }
}
