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
// @ts-ignore - Optional Swagger decorators
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '../common/decorators/swagger.decorators';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiOperation({ summary: 'Get all users', description: 'Retrieve a list of all users in the system' })
  @ApiQuery({ name: 'includeSystem', required: false, type: Boolean, description: 'Include system/bot users when true' })
  @ApiResponse({ status: 200, description: 'List of users retrieved successfully' })
  findAll(@Query('includeSystem') includeSystem?: string) {
    const includeSystemUsers = includeSystem === 'true' || includeSystem === '1';
    return this.usersService.findAll(includeSystemUsers);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a specific user by their ID' })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('org_owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Create a new user', description: 'Create a new user account. Requires admin or manager role.' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('org_owner', 'admin', 'manager')
  @ApiOperation({ summary: 'Update user', description: 'Update user information. Requires admin or manager role.' })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status', description: 'Update user status and activity (online/offline/away)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('org_owner', 'admin')
  @ApiOperation({ summary: 'Delete user', description: 'Permanently delete a user account. Requires admin role.' })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}


