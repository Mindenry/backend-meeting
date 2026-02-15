import { Module } from '@nestjs/common';
import { VirtualOfficeService } from './virtual-office.service';
import { VirtualOfficeController } from './virtual-office.controller';
import { VirtualOfficeGateway } from './virtual-office.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, EventsModule, CommonModule],
  providers: [VirtualOfficeService, VirtualOfficeGateway],
  controllers: [VirtualOfficeController],
  exports: [VirtualOfficeService, VirtualOfficeGateway],
})
export class VirtualOfficeModule {}
