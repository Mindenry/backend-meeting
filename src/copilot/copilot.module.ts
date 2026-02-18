import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CopilotService } from './copilot.service';
import { CopilotController } from './copilot.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CopilotController],
  providers: [CopilotService],
})
export class CopilotModule {}

