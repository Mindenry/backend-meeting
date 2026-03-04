import { Controller, Post, UseGuards } from '@nestjs/common';
import { MeetingRemindersService } from './meeting-reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('meeting-reminders')
@UseGuards(JwtAuthGuard)
export class MeetingRemindersController {
  constructor(private readonly remindersService: MeetingRemindersService) {}

  /**
   * Manually trigger reminder check (for testing/admin purposes)
   * POST /meeting-reminders/trigger
   */
  @Post('trigger')
  async triggerCheck() {
    await this.remindersService.triggerReminderCheck();
    return { success: true, message: 'Reminder check triggered' };
  }
}
