import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    NotificationsModule,
    TasksModule,
    MeetingsModule,
    RepositoriesModule,
    CommonModule,
  ],
  providers: [WorkflowsService],
  controllers: [WorkflowsController],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
