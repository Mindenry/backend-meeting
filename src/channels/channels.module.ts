import { Module, forwardRef } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [PrismaModule, forwardRef(() => EventsModule)],
    controllers: [ChannelsController],
    providers: [ChannelsService],
    exports: [ChannelsService],
})
export class ChannelsModule { }
