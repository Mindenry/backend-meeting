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
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  createReminder(
    @Body()
    body: {
      title: string;
      description?: string;
      type: string;
      relatedId?: string;
      relatedType?: string;
      remindAt: string;
      userIds: string[];
      createdBy: string;
    },
  ) {
    return this.remindersService.createReminder({
      ...body,
      remindAt: new Date(body.remindAt),
    });
  }

  @Get()
  getReminders(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('relatedId') relatedId?: string,
    @Query('isSent') isSent?: string,
  ) {
    return this.remindersService.getReminders({
      userId,
      type,
      relatedId,
      isSent: isSent === 'true' ? true : isSent === 'false' ? false : undefined,
    });
  }

  @Get('pending')
  getPendingReminders() {
    return this.remindersService.getPendingReminders();
  }

  @Get(':id')
  getReminder(@Param('id') id: string) {
    return this.remindersService.getReminder(id);
  }

  @Patch(':id')
  updateReminder(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      remindAt?: string;
      isSent?: boolean;
      userId: string;
    },
  ) {
    const { userId, ...data } = body;
    return this.remindersService.updateReminder(
      id,
      {
        ...data,
        remindAt: data.remindAt ? new Date(data.remindAt) : undefined,
      },
      userId,
    );
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.remindersService.markAsRead(id, body.userId);
  }

  @Delete(':id')
  deleteReminder(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.remindersService.deleteReminder(id, body.userId);
  }
}
