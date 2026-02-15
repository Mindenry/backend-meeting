import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
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
      priority?: 'high' | 'medium' | 'low';
      status?: 'todo' | 'in_progress' | 'review' | 'done';
      dueDate?: string | null;
      tags?: string[];
      assigneeId?: string | null;
      teamId?: string | null;
      meetingId?: string | null;
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
      priority: 'high' | 'medium' | 'low';
      status: 'todo' | 'in_progress' | 'review' | 'done';
      dueDate: string | null;
      tags: string[];
      assigneeId?: string | null;
      teamId?: string | null;
      meetingId?: string | null;
    }>,
  ) {
    const { dueDate, ...rest } = body;
    return this.tasksService.update(id, {
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}


