import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MinutesService } from './minutes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('minutes')
@UseGuards(JwtAuthGuard)
export class MinutesController {
  constructor(private readonly minutesService: MinutesService) {}

  @Post()
  createMinutes(
    @Body()
    body: {
      meetingId: string;
      title: string;
      content: string;
      actionItems?: any[];
      decisions?: any[];
      attendees: string[];
      createdBy: string;
    },
  ) {
    return this.minutesService.createMinutes(body);
  }

  @Get()
  getMinutes(@Query('meetingId') meetingId?: string) {
    return this.minutesService.getMinutes(meetingId);
  }

  @Get(':id')
  getMinute(@Param('id') id: string) {
    return this.minutesService.getMinute(id);
  }

  @Patch(':id')
  updateMinutes(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      content?: string;
      actionItems?: any[];
      decisions?: any[];
      attendees?: string[];
      userId: string;
    },
  ) {
    const { userId, ...data } = body;
    return this.minutesService.updateMinutes(id, data, userId);
  }

  @Delete(':id')
  deleteMinutes(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.minutesService.deleteMinutes(id, body.userId);
  }
}
