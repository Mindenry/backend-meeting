import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [PrismaModule, EventsModule, NotificationsModule, TasksModule],
  providers: [AIService],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}
