import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages/:messageId/reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string; emoji: string },
  ) {
    return this.reactionsService.addReaction(messageId, body.userId, body.emoji);
  }

  @Get()
  async getReactions(@Param('messageId') messageId: string) {
    return this.reactionsService.getReactions(messageId);
  }

  @Delete()
  async removeReaction(
    @Param('messageId') messageId: string,
    @Body() body: { userId: string; emoji: string },
  ) {
    return this.reactionsService.removeReaction(messageId, body.userId, body.emoji);
  }
}


