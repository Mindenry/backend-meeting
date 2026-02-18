import { Module } from '@nestjs/common';
import { MinutesController } from './minutes.controller';
import { MinutesService } from './minutes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [MinutesController],
  providers: [MinutesService],
  exports: [MinutesService],
})
export class MinutesModule {}
