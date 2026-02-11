import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @Query('status') status?: any,
    @Query('teamId') teamId?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasksService.findAll({
      status,
      teamId,
      assigneeId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      description?: string;
      priority?: 'high' | 'medium' | 'low' | 'urgent';
      status?: 'todo' | 'in_progress' | 'review' | 'done';
      dueDate?: string | null;
      tags?: string[];
      assigneeId?: string | null;
      teamId?: string | null;
      meetingId?: string | null;
      createdBy?: string;
    },
  ) {
    return this.tasksService.create({
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      description?: string;
      priority: 'high' | 'medium' | 'low' | 'urgent';
      status: 'todo' | 'in_progress' | 'review' | 'done';
      dueDate: string | null;
      tags: string[];
      assigneeId?: string | null;
      teamId?: string | null;
      meetingId?: string | null;
      userId?: string;
    }>,
  ) {
    const { dueDate, userId, ...rest } = body;
    return this.tasksService.update(
      id,
      {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      },
      userId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}


