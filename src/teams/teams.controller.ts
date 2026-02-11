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
import { TeamsService } from './teams.service';

@Controller('teams')
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
  create(@Body() body: { name: string; description?: string; organizationId?: string }) {
    return this.teamsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string }) {
    return this.teamsService.update(id, body);
  }

  @Delete(':id')
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
  removeMember(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.teamsService.removeMember(id, userId);
  }
}


