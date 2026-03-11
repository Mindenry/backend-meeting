import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationDigestService } from './notification-digest.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationPreferencesService,
    NotificationDigestService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    NotificationPreferencesService,
    NotificationDigestService,
  ],
})
export class NotificationsModule {}
