import { Module } from '@nestjs/common';
import { MeetingRemindersService } from './meeting-reminders.service';
import { MeetingRemindersController } from './meeting-reminders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [MeetingRemindersService],
  controllers: [MeetingRemindersController],
  exports: [MeetingRemindersService],
})
export class MeetingRemindersModule {}
