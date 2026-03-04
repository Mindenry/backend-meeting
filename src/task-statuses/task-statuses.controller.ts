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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TaskStatusesService } from './task-statuses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('task-statuses')
@UseGuards(JwtAuthGuard)
export class TaskStatusesController {
  constructor(private readonly taskStatusesService: TaskStatusesService) {}

  @Get()
  findAll(@Query('teamId') teamId?: string) {
    return this.taskStatusesService.findAll(teamId);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      key: string;
      color?: string;
      category?: string;
      position?: number;
      teamId?: string;
    },
  ) {
    return this.taskStatusesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      color?: string;
      category?: string;
      position?: number;
    },
  ) {
    return this.taskStatusesService.update(id, body);
  }

  @Patch('reorder/batch')
  reorder(@Body() body: { statusIds: string[] }) {
    return this.taskStatusesService.reorder(body.statusIds);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.taskStatusesService.remove(id);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Cannot delete status',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('seed')
  seed(@Body() body: { teamId?: string }) {
    return this.taskStatusesService.seedDefaults(body?.teamId);
  }
}
