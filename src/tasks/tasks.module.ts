import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TaskWatchersModule } from '../task-watchers/task-watchers.module';

@Module({
  imports: [forwardRef(() => EventsModule), NotificationsModule, PrismaModule, forwardRef(() => WorkflowsModule), TaskWatchersModule],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}


