import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
    constructor(private readonly channelsService: ChannelsService) { }

    @Get()
    findAll(@Query('teamId') teamId?: string) {
        return this.channelsService.findAll({ teamId });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.channelsService.findOne(id);
    }

    @Post()
    create(
        @Body()
        body: {
            name: string;
            type?: string;
            description?: string;
            teamId: string;
        },
    ) {
        return this.channelsService.create(body);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body()
        body: {
            name?: string;
            type?: string;
            description?: string;
        },
    ) {
        return this.channelsService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.channelsService.remove(id);
    }
}
