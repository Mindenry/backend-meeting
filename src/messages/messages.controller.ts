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
  Request,
  UnauthorizedException,
} from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '../common/decorators/swagger.decorators';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';

@ApiTags('messages')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('channels/:channelId/messages')
    @ApiOperation({ summary: 'Get messages by channel', description: 'Retrieve messages from a specific channel with pagination support' })
    @ApiParam({ name: 'channelId', description: 'Channel ID', example: 'channel-789' })
    @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of messages to return', example: '50', type: String })
    @ApiQuery({ name: 'before', required: false, description: 'Message ID to fetch messages before this ID', example: 'msg-123', type: String })
    @ApiQuery({ name: 'userId', required: false, description: 'User ID for filtering', example: 'user-123', type: String })
    @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
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
    @ApiOperation({ summary: 'Create a new message', description: 'Send a new message to a channel with optional attachments and mentions' })
    @ApiParam({ name: 'channelId', description: 'Channel ID', example: 'channel-789' })
    @ApiResponse({ status: 201, description: 'Message created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Param('channelId') channelId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const { text, ...rest } = createMessageDto;
    // Allow attachment-only messages by normalizing missing text to an empty string
    return this.messagesService.create({
      ...rest,
      text: text ?? '',
      channelId,
    });
  }

  @Patch('messages/:id')
    @ApiOperation({ summary: 'Update message', description: 'Update message text or pin/unpin status' })
    @ApiParam({ name: 'id', description: 'Message ID', example: 'msg-123' })
    @ApiResponse({ status: 200, description: 'Message updated successfully' })
    @ApiResponse({ status: 404, description: 'Message not found' })
  update(@Param('id') id: string, @Body() updateMessageDto: UpdateMessageDto) {
    return this.messagesService.update(id, updateMessageDto);
  }

  @Delete('messages/:id')
    @ApiOperation({ summary: 'Delete message', description: 'Permanently delete a message' })
    @ApiParam({ name: 'id', description: 'Message ID', example: 'msg-123' })
    @ApiResponse({ status: 200, description: 'Message deleted successfully' })
    @ApiResponse({ status: 404, description: 'Message not found' })
  remove(@Param('id') id: string) {
    return this.messagesService.remove(id);
  }

  @Get('messages/search')
    @ApiOperation({ summary: 'Search messages', description: 'Search messages across channels with various filters' })
    @ApiQuery({ name: 'query', required: true, description: 'Search query text', example: 'meeting notes', type: String })
    @ApiQuery({ name: 'channelId', required: false, description: 'Filter by channel ID', example: 'channel-789', type: String })
    @ApiQuery({ name: 'senderId', required: false, description: 'Filter by sender user ID', example: 'user-123', type: String })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date filter (ISO format)', example: '2024-01-01T00:00:00.000Z', type: String })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date filter (ISO format)', example: '2024-12-31T23:59:59.000Z', type: String })
    @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', example: '20', type: String })
    @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
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
    @ApiOperation({ summary: 'Mark message as read', description: 'Mark a message as read for a specific user' })
    @ApiParam({ name: 'id', description: 'Message ID', example: 'msg-123' })
    @ApiResponse({ status: 200, description: 'Message marked as read successfully' })
    @ApiResponse({ status: 404, description: 'Message not found' })
  markAsRead(@Param('id') id: string, @Body() markReadDto: MarkReadDto) {
    return this.messagesService.markAsRead(id, markReadDto.userId);
  }

  @Get('channels/:channelId/unread-count')
    @ApiOperation({ summary: 'Get unread message count', description: 'Get the count of unread messages in a channel for a user' })
    @ApiParam({ name: 'channelId', description: 'Channel ID', example: 'channel-789' })
    @ApiQuery({ name: 'userId', required: true, description: 'User ID', example: 'user-123', type: String })
    @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  getUnreadCount(
    @Param('channelId') channelId: string,
    @Query('userId') userId: string,
  ) {
    return this.messagesService.getUnreadCount(channelId, userId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DIRECT MESSAGES (DM)
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('dm/:otherUserId/messages')
  @ApiOperation({
    summary: 'Get direct messages between current user and another user',
    description: 'Retrieve DM history between the authenticated user and another user.',
  })
  @ApiParam({
    name: 'otherUserId',
    description: 'Other user ID',
    example: 'user-456',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of messages to return',
    example: '100',
    type: String,
  })
  @ApiQuery({
    name: 'before',
    required: false,
    description: 'Only return messages created before this ISO date',
    example: '2024-01-01T00:00:00.000Z',
    type: String,
  })
  getDirectMessages(
    @Param('otherUserId') otherUserId: string,
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.messagesService.getDirectMessages(currentUserId, otherUserId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      before,
    });
  }
}
