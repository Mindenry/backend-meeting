import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get email service status', description: 'Check if email service is configured and ready' })
  @ApiResponse({ status: 200, description: 'Email service status' })
  getStatus() {
    return this.emailService.getStatus();
  }

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
