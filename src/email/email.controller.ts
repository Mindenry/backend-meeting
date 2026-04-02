import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @ApiOperation({ summary: 'Send test email', description: 'Send a test email to verify SMTP configuration' })
  @ApiResponse({ status: 200, description: 'Test email result' })
  async sendTestEmail(@Body('to') to: string) {
    if (!to) {
      return { success: false, message: 'Email address is required' };
    }
    return this.emailService.sendTestEmail(to);
  }
}
