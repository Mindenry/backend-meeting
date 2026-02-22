import { Module, forwardRef } from '@nestjs/common';
import { StandupsService } from './standups.service';
import { StandupsController } from './standups.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, forwardRef(() => EventsModule), CommonModule],
  providers: [StandupsService],
  controllers: [StandupsController],
  exports: [StandupsService],
})
export class StandupsModule {}

