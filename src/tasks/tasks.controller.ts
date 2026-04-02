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
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '../common/decorators/swagger.decorators';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @Query('status') status?: any,
    @Query('teamId') teamId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('meetingId') meetingId?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.tasksService.findAll({
      status,
      teamId,
      assigneeId,
      meetingId,
      priority,
      search,
      dueDateFrom,
      dueDateTo,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('templates')
  getTemplates(
    @Query('teamId') teamId?: string,
    @Query('createdById') createdById?: string,
  ) {
    return this.tasksService.getTemplates({ teamId, createdById });
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.tasksService.getTemplate(id);
  }

  @Post('templates')
  createTemplate(
    @Body()
    body: {
      name: string;
      description?: string;
      title: string;
      content?: string;
      priority?: string;
      issueType?: string;
      tags?: string[];
      storyPoints?: number;
      estimate?: number;
      teamId?: string;
      projectId?: string;
      componentId?: string;
      versionId?: string;
      createdById: string;
    },
  ) {
    return this.tasksService.createTemplate(body);
  }

  @Patch('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      title?: string;
      content?: string;
      priority?: string;
      issueType?: string;
      tags?: string[];
      storyPoints?: number | null;
      estimate?: number | null;
      teamId?: string | null;
      projectId?: string | null;
      componentId?: string | null;
      versionId?: string | null;
    },
  ) {
    return this.tasksService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.tasksService.deleteTemplate(id);
  }

  @Post('templates/:id/create-task')
  createTaskFromTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      createdBy: string;
      assigneeId?: string;
      assigneeIds?: string[];
      teamId?: string;
      projectId?: string;
      componentId?: string;
      versionId?: string;
      dueDate?: string;
      meetingId?: string;
      sprintId?: string;
      epicId?: string;
      titleOverride?: string;
      descriptionOverride?: string;
    },
  ) {
    return this.tasksService.createTaskFromTemplate(id, {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
  }

  @Post('recurring/generate')
  generateRecurringTasks(@Body() body: { untilDate?: string }) {
    return this.tasksService.generateRecurringTasks(
      body.untilDate ? new Date(body.untilDate) : undefined,
    );
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
  @ApiOperation({
    summary: 'Create a new task',
    description:
      'Create a new task with optional assignee, team, and other metadata',
  })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  create(@Body() createTaskDto: CreateTaskDto) {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      tags,
      assigneeId,
      assigneeIds,
      teamId,
      meetingId,
      isRecurring,
      recurringPattern,
      recurringInterval,
      recurringEndDate,
      templateId,
      createdBy,
    } = createTaskDto;

    return this.tasksService.create({
      title,
      description,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags,
      assigneeId,
      assigneeIds,
      teamId,
      meetingId,
      isRecurring,
      recurringPattern,
      recurringInterval,
      recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
      templateId,
      createdBy,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Update task properties. Only provided fields will be updated.',
  })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      tags,
      assigneeId,
      assigneeIds,
      teamId,
      meetingId,
      isRecurring,
      recurringPattern,
      recurringInterval,
      recurringEndDate,
      templateId,
      userId,
    } = updateTaskDto;

    return this.tasksService.update(
      id,
      {
        title,
        description,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
        assigneeId,
        assigneeIds,
        teamId,
        meetingId,
        isRecurring,
        recurringPattern,
        recurringInterval,
        recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
        templateId,
      },
      userId,
    );
  }

  @Patch(':id/position')
  updatePosition(
    @Param('id') id: string,
    @Body() body: { status: string; position: number; teamId?: string },
  ) {
    return this.tasksService.updatePosition(
      id,
      body.status,
      body.position,
      body.teamId,
    );
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

  @Post(':id/attachments')
  addAttachment(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
      name: string;
      url: string;
      mimeType?: string;
      size?: number;
    },
  ) {
    return this.tasksService.addAttachment(
      id,
      body.userId,
      body.name,
      body.url,
      body.mimeType,
      body.size,
    );
  }

  @Delete('attachments/:attachmentId')
  deleteAttachment(@Param('attachmentId') attachmentId: string) {
    return this.tasksService.deleteAttachment(attachmentId);
  }

  // Issue Links
  @Post(':id/links')
  addIssueLink(
    @Param('id') id: string,
    @Body() body: { targetId: string; type: string },
  ) {
    return this.tasksService.addIssueLink(id, body.targetId, body.type);
  }

  @Get(':id/links')
  getIssueLinks(@Param('id') id: string) {
    return this.tasksService.getIssueLinks(id);
  }

  @Delete('links/:linkId')
  deleteIssueLink(@Param('linkId') linkId: string) {
    return this.tasksService.deleteIssueLink(linkId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
