import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('threads')
@UseGuards(JwtAuthGuard)
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  async createThread(@Body() body: { channelId: string; messageId: string }) {
    return this.threadsService.createThread(body.channelId, body.messageId);
  }

  @Get('channel/:channelId')
  async getThreadsByChannel(@Param('channelId') channelId: string) {
    return this.threadsService.getThreadsByChannel(channelId);
  }

  @Get(':id')
  async getThread(@Param('id') id: string) {
    return this.threadsService.getThread(id);
  }

  @Post(':id/replies')
  async addReply(
    @Param('id') threadId: string,
    @Body() body: { senderId: string; text: string },
  ) {
    return this.threadsService.addReply(threadId, body.senderId, body.text);
  }
}


