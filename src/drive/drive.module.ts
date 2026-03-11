import { Module, forwardRef } from '@nestjs/common';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => EventsModule)],
  providers: [DriveService],
  controllers: [DriveController],
})
export class DriveModule {}
