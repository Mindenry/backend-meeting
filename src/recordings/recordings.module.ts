import { Module } from '@nestjs/common';
import { RecordingsController } from './recordings.controller';
import { RecordingsUploadController } from './recordings-upload.controller';
import { RecordingsService } from './recordings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { DriveModule } from '../drive/drive.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, CommonModule, DriveModule, StorageModule],
  controllers: [RecordingsController, RecordingsUploadController],
  providers: [RecordingsService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
