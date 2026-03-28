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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '../common/decorators/swagger.decorators';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all teams',
    description: 'Retrieve a list of all teams',
  })
  @ApiResponse({
    status: 200,
    description: 'List of teams retrieved successfully',
  })
  findAll(@Req() req: any) {
    return this.teamsService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get team by ID',
    description: 'Retrieve a specific team by its ID',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team-123' })
  @ApiResponse({ status: 200, description: 'Team retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('org_owner', 'admin')
  @ApiOperation({
    summary: 'Create a new team',
    description:
      'Create a new team with name and optional description. Restricted to admins and org owners.',
  })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async create(@Body() createTeamDto: CreateTeamDto, @Req() req: any) {
    const user = req.user;
    const creatorId = user?.id as string | undefined;

    // Prefer organizationId from JWT when not explicitly provided
    const organizationId = createTeamDto.organizationId ?? user?.organizationId;

    const team = await this.teamsService.create({
      name: createTeamDto.name,
      description: createTeamDto.description,
      organizationId,
    });

    // Auto-add creator as Team Lead (if authenticated)
    if (creatorId) {
      await this.teamsService.addMember(team.id, creatorId, 'lead');
    }

    return team;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update team',
    description: 'Update team information (name)',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team-123' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @Req() req: any,
  ) {
    return this.teamsService.update(id, updateTeamDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete team',
    description:
      'Permanently delete a team. Requires org owner or team lead role.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team-123' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or team lead required',
  })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.teamsService.remove(id, req.user);
  }

  // --- members ---

  @Get(':id/members')
  @ApiOperation({
    summary: 'List team members',
    description: 'Get all members of a specific team',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team-123' })
  @ApiQuery({
    name: 'includeSystem',
    required: false,
    type: Boolean,
    description: 'Include system users such as bots when true',
  })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
  })
  listMembers(
    @Param('id') id: string,
    @Query('includeSystem') includeSystem?: string,
  ) {
    const includeSystemUsers =
      includeSystem === 'true' || includeSystem === '1';
    return this.teamsService.listMembers(id, includeSystemUsers);
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Add member to team',
    description: 'Add a user to a team with optional role',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team-123' })
  @ApiResponse({
    status: 201,
    description: 'Member added to team successfully',
  })
  @ApiResponse({ status: 404, description: 'Team or user not found' })
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.teamsService.addMember(
      id,
      addMemberDto.userId,
      addMemberDto.role,
    );
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({
    summary: 'Update team member role',
    description:
      'Update team role (lead/member). Restricted to org owner or team lead.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team-123' })
  @ApiParam({
    name: 'userId',
    description: 'User ID in team',
    example: 'user-456',
  })
  @ApiQuery({
    name: 'role',
    description: 'Target role: lead/member',
    example: 'lead',
  })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 404, description: 'Team member not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin or team lead only',
  })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('role') role: string,
    @Req() req: any,
  ) {
    return this.teamsService.updateMemberRole(id, userId, role, req.user);
  }

  @Delete(':id/members')
  @ApiOperation({
    summary: 'Remove member from team',
    description:
      'Remove a user from a team. Requires org manager or team lead role.',
  })
  @ApiParam({ name: 'id', description: 'Team ID', example: 'team-123' })
  @ApiQuery({
    name: 'userId',
    description: 'User ID to remove',
    example: 'user-456',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed from team successfully',
  })
  @ApiResponse({ status: 404, description: 'Team or user not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  removeMember(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Req() req: any,
  ) {
    return this.teamsService.removeMember(id, userId, req.user);
  }
}
