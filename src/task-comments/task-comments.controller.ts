import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';

@Controller('tasks/:taskId/comments')
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @Post()
  async create(
    @Param('taskId') taskId: string,
    @Body() body: { userId: string; text: string },
  ) {
    return this.commentsService.create(taskId, body.userId, body.text);
  }

  @Get()
  async getByTask(@Param('taskId') taskId: string) {
    return this.commentsService.getByTask(taskId);
  }

  @Patch(':id')
  async update(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @Body() body: { userId: string; text: string },
  ) {
    return this.commentsService.update(id, body.userId, body.text);
  }

  @Delete(':id')
  async delete(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.commentsService.delete(id, body.userId);
  }
}

