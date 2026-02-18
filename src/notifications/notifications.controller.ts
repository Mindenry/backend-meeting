import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Query('userId') userId: string, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.findAll(userId, unreadOnly === 'true');
  }

  @Get('user/:userId')
  getUserNotifications(@Param('userId') userId: string, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.getUserNotifications(userId, unreadOnly === 'true');
  }

  @Get('unread-count')
  getUnreadCount(@Query('userId') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('user/:userId/unread-count')
  getUnreadCountParam(@Param('userId') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post()
  create(@Body() data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    link?: string;
  }) {
    return this.notificationsService.create(data);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Query('userId') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  markAllAsRead(@Query('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch('user/:userId/read-all')
  markAllAsReadParam(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.notificationsService.remove(id, userId);
  }
}
