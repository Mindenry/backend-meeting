import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
} from '../common/decorators/swagger.decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnnouncementsService } from './announcements.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async findAll(@Request() req) {
    // Get user's teams
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId: req.user.id },
      include: { team: true },
    });
    const teamIds = memberships.map((m) => m.team.id);

    return this.announcementsService.findAll(
      req.user.id,
      req.user.role,
      teamIds,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.announcementsService.findOne(id, req.user.id);
  }

  /**
   * Create a new announcement.
   * Only org_owner, admin, and manager can broadcast announcements.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('org_owner', 'admin', 'manager')
  async create(@Body() body: any, @Request() req) {
    return this.announcementsService.create({
      ...body,
      createdBy: req.user.id,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }
}
