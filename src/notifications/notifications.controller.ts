import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import { ApiTags, ApiBearerAuth } from '../common/decorators/swagger.decorators';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationDigestService } from './notification-digest.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly digestService: NotificationDigestService,
  ) {}

  @Get()
  findAll(
    @Query('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('priority') priority?: string,
    @Query('grouped') grouped?: string,
  ) {
    return this.notificationsService.findAll(userId, unreadOnly === 'true', {
      priority,
      grouped: grouped === 'true',
    });
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

  // Preferences endpoints
  @Get('preferences')
  getPreferences(@Query('userId') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @Patch('preferences')
  updatePreferences(
    @Query('userId') userId: string,
    @Body() data: {
      mentionDelivery?: string;
      taskAssignedDelivery?: string;
      meetingStartingDelivery?: string;
      pullRequestReviewDelivery?: string;
      taskUpdateDelivery?: string;
      meetingCreatedDelivery?: string;
      messageDelivery?: string;
      announcementDelivery?: string;
      teamUpdateDelivery?: string;
      digestTime?: string;
      digestTimezone?: string;
      digestIncludeRead?: boolean;
      soundEnabled?: boolean;
      desktopEnabled?: boolean;
      badgeEnabled?: boolean;
    },
  ) {
    return this.preferencesService.updatePreferences(userId, data);
  }

  // Digest endpoints
  @Get('digests')
  getDigests(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('digestType') digestType?: string,
  ) {
    return this.digestService.getUserDigests(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      digestType,
    });
  }

  @Patch('digests/:id/read')
  markDigestAsRead(@Param('id') id: string, @Query('userId') userId: string) {
    return this.digestService.markDigestAsRead(id, userId);
  }
}
