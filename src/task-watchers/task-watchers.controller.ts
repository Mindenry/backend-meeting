import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TaskWatchersService } from './task-watchers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('task-watchers')
@UseGuards(JwtAuthGuard)
export class TaskWatchersController {
  constructor(private readonly taskWatchersService: TaskWatchersService) {}

  @Get()
  async getWatchers(@Query('taskId') taskId: string) {
    if (!taskId || typeof taskId !== 'string') {
      throw new BadRequestException('taskId query parameter is required');
    }
    return this.taskWatchersService.getWatchers(taskId);
  }

  @Get('is-watching')
  async isWatching(@Query('taskId') taskId: string, @Query('userId') userId: string) {
    if (!taskId || !userId) {
      throw new BadRequestException('taskId and userId query parameters are required');
    }
    return this.taskWatchersService.isWatching(taskId, userId);
  }

  @Post()
  watch(@Body() body: { taskId: string; userId: string }) {
    return this.taskWatchersService.watch(body.taskId, body.userId);
  }

  @Delete()
  unwatch(@Query('taskId') taskId: string, @Query('userId') userId: string) {
    return this.taskWatchersService.unwatch(taskId, userId);
  }
}
