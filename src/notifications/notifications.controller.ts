import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      unreadOnly === 'true',
    );
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.notificationsService.markAsRead(id, body.userId);
  }

  @Patch('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.notificationsService.delete(id, body.userId);
  }

  @Post()
  async create(@Body() body: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.notificationsService.create(body);
  }
}

