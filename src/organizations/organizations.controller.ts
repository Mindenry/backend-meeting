import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Create a new organization.
   * This is a high-privilege operation – limit to org_owner only.
   * In most real setups, organizations are created via provisioning scripts or
   * a dedicated onboarding flow.
   */
  @Post()
  @Roles('org_owner')
  create(@Body() createOrganizationDto: Prisma.OrganizationCreateInput) {
    return this.organizationsService.create(createOrganizationDto);
  }

  /**
   * List organizations.
   * Typically used only by very high-privilege users.
   */
  @Get()
  @Roles('org_owner', 'admin')
  findAll() {
    return this.organizationsService.findAll();
  }

  /**
   * Get the organization details for the given ID.
   * All authenticated users can access their own organization.
   */
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const userOrgId = req.user?.organizationId;
    if (!userOrgId || userOrgId !== id) {
      throw new ForbiddenException('Cannot access another organization');
    }
    return this.organizationsService.findOne(id);
  }

  /**
   * Update organization settings (including security policy).
   * org_owner, admin, and manager can update their own organization only.
   */
  @Patch(':id')
  @Roles('org_owner', 'admin', 'manager')
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: Prisma.OrganizationUpdateInput,
    @Request() req: any,
  ) {
    const userOrgId = req.user?.organizationId;
    if (!userOrgId || userOrgId !== id) {
      throw new ForbiddenException('Cannot update another organization');
    }
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  /**
   * Delete an organization.
   * Extremely sensitive – restrict to org_owner only.
   */
  @Delete(':id')
  @Roles('org_owner')
  remove(@Param('id') id: string, @Request() req: any) {
    const userOrgId = req.user?.organizationId;
    if (!userOrgId || userOrgId !== id) {
      throw new ForbiddenException('Cannot delete another organization');
    }
    return this.organizationsService.remove(id);
  }
}
