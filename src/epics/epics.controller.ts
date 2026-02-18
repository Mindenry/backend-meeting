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
import { EpicsService } from './epics.service';

@Controller('epics')
export class EpicsController {
  constructor(private readonly epicsService: EpicsService) {}

  @Get()
  findAll(@Query('teamId') teamId?: string) {
    return this.epicsService.findAll(teamId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.epicsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      color?: string;
      teamId: string;
      createdById: string;
    },
  ) {
    return this.epicsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description?: string;
      color?: string;
      status: string;
    }>,
  ) {
    return this.epicsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.epicsService.remove(id);
  }
}
