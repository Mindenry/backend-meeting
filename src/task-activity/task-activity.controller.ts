import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaskActivityService } from './task-activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('task-activity')
@UseGuards(JwtAuthGuard)
export class TaskActivityController {
  constructor(private readonly taskActivityService: TaskActivityService) {}

  @Get(':taskId')
  findByTaskId(
    @Param('taskId') taskId: string,
    @Query('limit') limit?: string,
  ) {
    return this.taskActivityService.findByTaskId(taskId, limit ? parseInt(limit) : 50);
  }
}
