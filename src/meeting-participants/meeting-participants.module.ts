import { Module } from '@nestjs/common';
import { MeetingParticipantsService } from './meeting-participants.service';
import { MeetingParticipantsController } from './meeting-participants.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MeetingParticipantsService],
  controllers: [MeetingParticipantsController],
  exports: [MeetingParticipantsService],
})
export class MeetingParticipantsModule {}
