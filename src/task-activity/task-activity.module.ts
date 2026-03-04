import { Module } from '@nestjs/common';
import { TaskActivityService } from './task-activity.service';
import { TaskActivityController } from './task-activity.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaskActivityController],
  providers: [TaskActivityService],
  exports: [TaskActivityService],
})
export class TaskActivityModule {}
