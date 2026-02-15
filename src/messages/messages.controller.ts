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
        @Query('userId') userId?: string,
    ) {
        return this.messagesService.findByChannel(channelId, {
            limit: limit ? parseInt(limit, 10) : undefined,
            before,
            userId,
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

    @Get('messages/search')
    search(
        @Query('query') query: string,
        @Query('channelId') channelId?: string,
        @Query('senderId') senderId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
    ) {
        return this.messagesService.search({
            query,
            channelId,
            senderId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Post('messages/:id/read')
    markAsRead(
        @Param('id') id: string,
        @Body() body: { userId: string },
    ) {
        return this.messagesService.markAsRead(id, body.userId);
    }

    @Get('channels/:channelId/unread-count')
    getUnreadCount(
        @Param('channelId') channelId: string,
        @Query('userId') userId: string,
    ) {
        return this.messagesService.getUnreadCount(channelId, userId);
    }
}
