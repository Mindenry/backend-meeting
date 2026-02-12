import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [PrismaModule, forwardRef(() => MessagesModule)],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
