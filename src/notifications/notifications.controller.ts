<<<<<<< HEAD
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

  @Get('unread-count')
  getUnreadCount(@Query('userId') userId: string) {
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
  }) {
    return this.notificationsService.create(data);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Query('userId') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  markAllAsRead(@Query('userId') userId: string) {
=======
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
>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
<<<<<<< HEAD
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.notificationsService.remove(id, userId);
=======
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
>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700
  }
}

