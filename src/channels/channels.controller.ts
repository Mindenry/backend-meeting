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
} from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '../common/decorators/swagger.decorators';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('channels')
@Controller('channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get('mine')
  @ApiOperation({
    summary: 'Get channels for current user',
    description: 'Retrieve channels from teams the current user is a member of',
  })
  @ApiQuery({
    name: 'includeMeeting',
    required: false,
    description: 'Include meeting channels when true',
    example: 'false',
  })
  @ApiResponse({
    status: 200,
    description: 'List of channels retrieved successfully',
  })
  findMine(
    @Request() req: any,
    @Query('includeMeeting') includeMeeting?: string,
  ) {
    const includeMeetingChannels =
      includeMeeting === 'true' || includeMeeting === '1';
    return this.channelsService.findByUserTeams(req.user?.id, {
      includeMeeting: includeMeetingChannels,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all channels',
    description: 'Retrieve channels, optionally filtered by team ID',
  })
  @ApiQuery({
    name: 'teamId',
    required: false,
    description: 'Filter by team ID',
    example: 'team-123',
  })
  @ApiQuery({
    name: 'includeMeeting',
    required: false,
    description: 'Include meeting channels when true',
    example: 'false',
  })
  @ApiResponse({
    status: 200,
    description: 'List of channels retrieved successfully',
  })
  findAll(
    @Query('teamId') teamId?: string,
    @Query('includeMeeting') includeMeeting?: string,
  ) {
    const includeMeetingChannels =
      includeMeeting === 'true' || includeMeeting === '1';
    return this.channelsService.findAll({
      teamId,
      includeMeeting: includeMeetingChannels,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get channel by ID',
    description: 'Retrieve a specific channel by its ID',
  })
  @ApiParam({ name: 'id', description: 'Channel ID', example: 'channel-456' })
  @ApiResponse({ status: 200, description: 'Channel retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('org_owner', 'admin', 'manager')
  @ApiOperation({
    summary: 'Create a new channel',
    description:
      'Create a new channel for a team. Requires admin or manager role.',
  })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  create(@Body() createChannelDto: CreateChannelDto) {
    return this.channelsService.create(createChannelDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('org_owner', 'admin', 'manager')
  @ApiOperation({
    summary: 'Update channel',
    description: 'Update channel information. Requires admin or manager role.',
  })
  @ApiParam({ name: 'id', description: 'Channel ID', example: 'channel-456' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  update(@Param('id') id: string, @Body() updateChannelDto: UpdateChannelDto) {
    return this.channelsService.update(id, updateChannelDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('org_owner', 'admin', 'manager')
  @ApiOperation({
    summary: 'Delete channel',
    description:
      'Permanently delete a channel. Requires admin or manager role.',
  })
  @ApiParam({ name: 'id', description: 'Channel ID', example: 'channel-456' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }
}
