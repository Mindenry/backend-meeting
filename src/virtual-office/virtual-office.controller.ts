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
import { VirtualOfficeService } from './virtual-office.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('virtual-office')
@UseGuards(JwtAuthGuard)
export class VirtualOfficeController {
  constructor(private readonly virtualOfficeService: VirtualOfficeService) {}

  @Post('rooms')
  createRoom(@Body() body: any, @Request() req: any) {
    return this.virtualOfficeService.createRoom({
      ...body,
      createdBy: req.user.userId,
    });
  }

  @Get('rooms')
  findAllRooms(
    @Query('teamId') teamId?: string,
    @Query('type') type?: string,
  ) {
    return this.virtualOfficeService.findAllRooms({ teamId, type });
  }

  @Get('rooms/:id')
  findOneRoom(@Param('id') id: string) {
    return this.virtualOfficeService.findOneRoom(id);
  }

  @Patch('rooms/:id')
  updateRoom(@Param('id') id: string, @Body() body: any) {
    return this.virtualOfficeService.updateRoom(id, body);
  }

  @Delete('rooms/:id')
  deleteRoom(@Param('id') id: string, @Request() req: any) {
    return this.virtualOfficeService.deleteRoom(id, req.user.userId);
  }

  @Post('rooms/:id/join')
  joinRoom(
    @Param('id') roomId: string,
    @Body() body?: { position?: { x: number; y: number } },
    @Request() req?: any,
  ) {
    return this.virtualOfficeService.joinRoom(roomId, req.user.userId, body?.position);
  }

  @Post('rooms/:id/leave')
  leaveRoom(@Param('id') roomId: string, @Request() req: any) {
    return this.virtualOfficeService.leaveRoom(roomId, req.user.userId);
  }

  @Patch('rooms/:id/presence')
  updatePresence(
    @Param('id') roomId: string,
    @Body() body: { position?: { x: number; y: number }; status?: 'active' | 'away' | 'busy' },
    @Request() req: any,
  ) {
    return this.virtualOfficeService.updatePresence(roomId, req.user.userId, body);
  }

  @Get('rooms/:id/presences')
  getRoomPresences(@Param('id') roomId: string) {
    return this.virtualOfficeService.getRoomPresences(roomId);
  }

  @Get('my-room')
  getMyCurrentRoom(@Request() req: any) {
    return this.virtualOfficeService.getUserCurrentRoom(req.user.userId);
  }

  @Post('quick-huddle')
  createQuickHuddle(
    @Body() body: { teamId: string; participantIds: string[] },
    @Request() req: any,
  ) {
    return this.virtualOfficeService.createQuickHuddle(
      body.teamId,
      req.user.userId,
      body.participantIds,
    );
  }
}
