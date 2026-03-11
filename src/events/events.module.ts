import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';
import { MeetingParticipantsModule } from '../meeting-participants/meeting-participants.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MessagesModule),
    MeetingParticipantsModule,
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
