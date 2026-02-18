import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('channels')
@UseGuards(JwtAuthGuard)
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
    @UseGuards(RolesGuard)
    @Roles('admin', 'manager')
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
    @UseGuards(RolesGuard)
    @Roles('admin', 'manager')
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
    @UseGuards(RolesGuard)
    @Roles('admin', 'manager')
    remove(@Param('id') id: string) {
        return this.channelsService.remove(id);
    }
}
