import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Get all permissions for a given organization
   * All authenticated users can view permissions (read-only for non-admins)
   */
  @Get(':orgId')
  async getPermissions(@Param('orgId') orgId: string, @Request() req: any) {
    this.validateOrgAccess(req, orgId);
    return this.permissionsService.getPermissions(orgId);
  }

  /**
   * Get permissions for a specific role
   */
  @Get(':orgId/:role')
  async getPermissionsByRole(
    @Param('orgId') orgId: string,
    @Param('role') role: string,
    @Request() req: any,
  ) {
    this.validateOrgAccess(req, orgId);
    return this.permissionsService.getPermissionsByRole(orgId, role);
  }

  /**
   * Bulk update permissions
   * Only org_owner and admin can modify permissions
   */
  @Put(':orgId')
  @Roles('org_owner', 'admin')
  async updatePermissions(
    @Param('orgId') orgId: string,
    @Body()
    body: {
      permissions: {
        role: string;
        resource: string;
        action: string;
        allowed: boolean;
      }[];
    },
    @Request() req: any,
  ) {
    this.validateOrgAccess(req, orgId);
    return this.permissionsService.updatePermissions(orgId, body.permissions);
  }

  /**
   * Seed default permissions for an organization
   */
  @Post(':orgId/seed')
  @Roles('org_owner', 'admin')
  async seedDefaults(@Param('orgId') orgId: string, @Request() req: any) {
    this.validateOrgAccess(req, orgId);
    return this.permissionsService.seedDefaults(orgId);
  }

  /**
   * Ensure user can only manage their own organization's permissions
   */
  private validateOrgAccess(req: any, orgId: string) {
    const userOrgId = req.user?.organizationId;
    if (!userOrgId || userOrgId !== orgId) {
      throw new ForbiddenException('Cannot access another organization');
    }
  }
}
