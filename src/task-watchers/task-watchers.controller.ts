import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TaskWatchersService } from './task-watchers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('task-watchers')
@UseGuards(JwtAuthGuard)
export class TaskWatchersController {
  constructor(private readonly taskWatchersService: TaskWatchersService) {}

  @Get()
  getWatchers(@Query('taskId') taskId: string) {
    return this.taskWatchersService.getWatchers(taskId);
  }

  @Get('is-watching')
  isWatching(
    @Query('taskId') taskId: string,
    @Query('userId') userId: string,
  ) {
    return this.taskWatchersService.isWatching(taskId, userId);
  }

  @Post()
  watch(@Body() body: { taskId: string; userId: string }) {
    return this.taskWatchersService.watch(body.taskId, body.userId);
  }

  @Delete()
  unwatch(
    @Query('taskId') taskId: string,
    @Query('userId') userId: string,
  ) {
    return this.taskWatchersService.unwatch(taskId, userId);
  }
}
