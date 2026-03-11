import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StandupsModule } from '../standups/standups.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => EventsModule),
    NotificationsModule,
    StandupsModule,
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
