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
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Get('channels/:channelId/messages')
    findByChannel(
        @Param('channelId') channelId: string,
        @Query('limit') limit?: string,
        @Query('before') before?: string,
    ) {
        return this.messagesService.findByChannel(channelId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            before,
        });
    }

    @Post('channels/:channelId/messages')
    create(
        @Param('channelId') channelId: string,
        @Body()
        body: {
            text: string;
            senderId: string;
            replyToId?: string;
            attachments?: Array<{ url: string; name: string; type: string }>;
            mentions?: string[];
        },
    ) {
        return this.messagesService.create({
            ...body,
            channelId,
        });
    }

    @Patch('messages/:id')
    update(
        @Param('id') id: string,
        @Body()
        body: {
            text?: string;
            isPinned?: boolean;
        },
    ) {
        return this.messagesService.update(id, body);
    }

    @Delete('messages/:id')
    remove(@Param('id') id: string) {
        return this.messagesService.remove(id);
    }
}
