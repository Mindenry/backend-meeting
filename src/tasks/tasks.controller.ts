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
    @Query('sprintId') sprintId?: string,
    @Query('epicId') epicId?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll({
      status,
      teamId,
      assigneeId,
      sprintId,
      epicId,
      priority,
      search,
    });
  }

  @Get('analytics')
  getAnalytics(@Query('teamId') teamId?: string) {
    return this.tasksService.getAnalytics(teamId);
  }

  @Get('activity')
  getActivity(
    @Query('teamId') teamId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.getActivity(teamId, limit ? parseInt(limit) : 20);
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
      sprintId?: string | null;
      epicId?: string | null;
      storyPoints?: number | null;
      estimate?: number | null;
      position?: number;
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
      sprintId?: string | null;
      epicId?: string | null;
      storyPoints?: number | null;
      estimate?: number | null;
      position?: number;
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

  @Patch(':id/position')
  updatePosition(
    @Param('id') id: string,
    @Body() body: { status: string; position: number; teamId?: string },
  ) {
    return this.tasksService.updatePosition(id, body.status, body.position, body.teamId);
  }

  @Post(':id/subtasks')
  addSubtask(@Param('id') id: string, @Body() body: { title: string }) {
    return this.tasksService.addSubtask(id, body.title);
  }

  @Patch('subtasks/:subtaskId')
  updateSubtask(
    @Param('subtaskId') subtaskId: string,
    @Body() body: { title?: string; isCompleted?: boolean; position?: number },
  ) {
    return this.tasksService.updateSubtask(subtaskId, body);
  }

  @Delete('subtasks/:subtaskId')
  deleteSubtask(@Param('subtaskId') subtaskId: string) {
    return this.tasksService.deleteSubtask(subtaskId);
  }

  @Post(':id/time-entries')
  addTimeEntry(
    @Param('id') id: string,
    @Body() body: { userId: string; hours: number; description?: string; date?: string },
  ) {
    return this.tasksService.addTimeEntry(
      id,
      body.userId,
      body.hours,
      body.description,
      body.date ? new Date(body.date) : undefined,
    );
  }

  @Delete('time-entries/:timeEntryId')
  deleteTimeEntry(@Param('timeEntryId') timeEntryId: string) {
    return this.tasksService.deleteTimeEntry(timeEntryId);
  }

  @Post(':id/attachments')
  addAttachment(
    @Param('id') id: string,
    @Body() body: { userId: string; name: string; url: string; mimeType?: string; size?: number },
  ) {
    return this.tasksService.addAttachment(id, body.userId, body.name, body.url, body.mimeType, body.size);
  }

  @Delete('attachments/:attachmentId')
  deleteAttachment(@Param('attachmentId') attachmentId: string) {
    return this.tasksService.deleteAttachment(attachmentId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}


