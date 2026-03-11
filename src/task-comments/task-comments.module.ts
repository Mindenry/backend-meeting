import { Module } from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TaskCommentsService],
  controllers: [TaskCommentsController],
  exports: [TaskCommentsService],
})
export class TaskCommentsModule {}
