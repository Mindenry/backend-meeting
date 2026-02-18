import { Body, Controller, Post } from '@nestjs/common';
import { CopilotService } from './copilot.service';

@Controller('ai')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('ask')
  ask(
    @Body()
    body: {
      question: string;
      userId?: string;
      teamId?: string;
    },
  ) {
    return this.copilotService.ask(body);
  }
}

