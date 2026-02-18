import { Controller, Post, UseGuards } from '@nestjs/common';
import { MeetingRemindersService } from './meeting-reminders.service';

@Controller('meeting-reminders')
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
