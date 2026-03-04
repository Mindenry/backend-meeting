import { Module, forwardRef } from '@nestjs/common';
import { IssueLinksService } from './issue-links.service';
import { IssueLinksController } from './issue-links.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, forwardRef(() => EventsModule)],
  controllers: [IssueLinksController],
  providers: [IssueLinksService],
  exports: [IssueLinksService],
})
export class IssueLinksModule {}
