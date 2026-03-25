import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
} from '../common/decorators/swagger.decorators';
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

  private getEffectiveUserId(req: any, requestedUserId?: string): string {
    const authUserId = req?.user?.id as string | undefined;
    if (!authUserId) {
      throw new ForbiddenException('User not authenticated');
    }

    const role = String(req?.user?.role || '').toLowerCase();
    const isAdmin = role === 'org_owner' || role === 'admin';

    if (!requestedUserId || requestedUserId === authUserId) {
      return authUserId;
    }

    if (!isAdmin) {
      throw new ForbiddenException('Cannot access other user notifications');
    }

    return requestedUserId;
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('priority') priority?: string,
    @Query('grouped') grouped?: string,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.findAll(
      effectiveUserId,
      unreadOnly === 'true',
      {
        priority,
        grouped: grouped === 'true',
      },
    );
  }

  @Get('user/:userId')
  getUserNotifications(
    @Request() req: any,
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.getUserNotifications(
      effectiveUserId,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any, @Query('userId') userId?: string) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.getUnreadCount(effectiveUserId);
  }

  @Get('user/:userId/unread-count')
  getUnreadCountParam(@Request() req: any, @Param('userId') userId: string) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.getUnreadCount(effectiveUserId);
  }

  @Post()
  create(
    @Body()
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      relatedId?: string;
      relatedType?: string;
      link?: string;
    },
  ) {
    return this.notificationsService.create(data);
  }

  @Patch(':id/read')
  markAsRead(
    @Request() req: any,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.markAsRead(id, effectiveUserId);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: any, @Query('userId') userId?: string) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.markAllAsRead(effectiveUserId);
  }

  @Patch('user/:userId/read-all')
  markAllAsReadParam(@Request() req: any, @Param('userId') userId: string) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.markAllAsRead(effectiveUserId);
  }

  @Delete(':id')
  remove(
    @Request() req: any,
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.notificationsService.remove(id, effectiveUserId);
  }

  // Preferences endpoints
  @Get('preferences')
  getPreferences(@Request() req: any, @Query('userId') userId?: string) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.preferencesService.getPreferences(effectiveUserId);
  }

  @Patch('preferences')
  updatePreferences(
    @Request() req: any,
    @Query('userId') userId: string,
    @Body()
    data: {
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
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.preferencesService.updatePreferences(effectiveUserId, data);
  }

  // Digest endpoints
  @Get('digests')
  getDigests(
    @Request() req: any,
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('digestType') digestType?: string,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.digestService.getUserDigests(effectiveUserId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      digestType,
    });
  }

  @Patch('digests/:id/read')
  markDigestAsRead(
    @Request() req: any,
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.digestService.markDigestAsRead(id, effectiveUserId);
  }
}
