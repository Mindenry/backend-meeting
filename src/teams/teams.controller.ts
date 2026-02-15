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
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.teamsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string }) {
    return this.teamsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  // --- members ---

  @Get(':id/members')
  listMembers(@Param('id') id: string) {
    return this.teamsService.listMembers(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.teamsService.addMember(id, body.userId, body.role);
  }

  @Delete(':id/members')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  removeMember(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.teamsService.removeMember(id, userId);
  }
}


