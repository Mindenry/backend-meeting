import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => EventsModule),
    NotificationsModule,
    forwardRef(() => TasksModule),
    forwardRef(() => MeetingsModule),
    CommonModule,
  ],
  providers: [WorkflowsService],
  controllers: [WorkflowsController],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
