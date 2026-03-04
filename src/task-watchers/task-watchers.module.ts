import { Module, forwardRef } from '@nestjs/common';
import { TaskWatchersService } from './task-watchers.service';
import { TaskWatchersController } from './task-watchers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule)],
  controllers: [TaskWatchersController],
  providers: [TaskWatchersService],
  exports: [TaskWatchersService],
})
export class TaskWatchersModule {}
