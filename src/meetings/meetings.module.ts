import { Module, forwardRef } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    forwardRef(() => EventsModule),
    NotificationsModule,
    PrismaModule,
    CommonModule,
    forwardRef(() => WorkflowsModule),
  ],
  providers: [MeetingsService],
  controllers: [MeetingsController],
  exports: [MeetingsService],
})
export class MeetingsModule {}
