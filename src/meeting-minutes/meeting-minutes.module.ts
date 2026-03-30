import { Module } from '@nestjs/common';
import { MeetingMinutesController } from './meeting-minutes.controller';
import { MeetingMinutesService } from './meeting-minutes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MeetingMinutesController],
  providers: [MeetingMinutesService],
  exports: [MeetingMinutesService],
})
export class MeetingMinutesModule {}
