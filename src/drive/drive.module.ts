import { Module, forwardRef } from '@nestjs/common';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';
import { EventsModule } from '../events/events.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [forwardRef(() => EventsModule), StorageModule],
  providers: [DriveService],
  controllers: [DriveController],
  exports: [DriveService],
})
export class DriveModule {}
