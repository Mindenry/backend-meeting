import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MeetingMinutesService } from './meeting-minutes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMeetingMinutesDto, UpdateMeetingMinutesDto } from './dto/create-meeting-minutes.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '../common/decorators/swagger.decorators';

@ApiTags('meeting-minutes')
@Controller('meeting-minutes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MeetingMinutesController {
  constructor(private readonly service: MeetingMinutesService) {}

  @Post()
  @ApiOperation({ summary: 'Create meeting minutes' })
  @ApiResponse({ status: 201, description: 'Meeting minutes created successfully' })
  create(@Request() req: any, @Body() dto: CreateMeetingMinutesDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('meeting/:meetingId')
  @ApiOperation({ summary: 'Get all minutes for a meeting' })
  @ApiResponse({ status: 200, description: 'List of meeting minutes' })
  findByMeeting(@Param('meetingId') meetingId: string) {
    return this.service.findByMeeting(meetingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meeting minutes by ID' })
  @ApiResponse({ status: 200, description: 'Meeting minutes details' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update meeting minutes' })
  @ApiResponse({ status: 200, description: 'Meeting minutes updated successfully' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateMeetingMinutesDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete meeting minutes' })
  @ApiResponse({ status: 200, description: 'Meeting minutes deleted successfully' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
