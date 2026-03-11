import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  /**
   * Create a new invite for a user in the same organization as the requester.
   * Only org_owner, admin, and manager can create invites.
   *
   * organizationId and invitedBy are always derived from the authenticated user
   * to prevent clients from spoofing these values.
   */
  @Post()
  @Roles('org_owner', 'admin', 'manager')
  async createInvite(
    @Request() req: any,
    @Body()
    body: {
      email: string;
      // organizationId and invitedBy will be ignored from body if present
      organizationId?: string;
      invitedBy?: string;
      role?: string;
      teamId?: string;
      teamRole?: string;
      expiresInDays?: number;
    },
  ) {
    const user = req.user;
    if (!user?.organizationId || !user?.id) {
      throw new ForbiddenException(
        'User must belong to an organization to send invites',
      );
    }

    const invite = await this.invitesService.createInvite({
      email: body.email,
      organizationId: user.organizationId,
      invitedBy: user.id,
      role: body.role,
      teamId: body.teamId,
      teamRole: body.teamRole,
      expiresInDays: body.expiresInDays,
    });

    return {
      ...invite,
      inviteLink: `/invite?token=${invite.token}`,
    };
  }

  /**
   * List all active invites in the requester’s organization.
   * Accessible to org_owner, admin, and manager.
   */
  @Get('organization/:orgId')
  @Roles('org_owner', 'admin', 'manager')
  async getInvitesByOrganization(
    @Param('orgId') orgId: string,
    @Request() req: any,
  ) {
    const user = req.user;
    if (!user?.organizationId || user.organizationId !== orgId) {
      throw new ForbiddenException(
        'Cannot access invites from another organization',
      );
    }
    return this.invitesService.getInvitesByOrganization(orgId);
  }

  /**
   * Get invite details by token.
   * This endpoint is intended for internal/admin use; public invite validation
   * should use the auth/invite/:token endpoint instead.
   */
  @Get(':token')
  @Roles('org_owner', 'admin', 'manager')
  async getInvite(@Param('token') token: string) {
    return this.invitesService.getInviteByToken(token);
  }

  /**
   * Cancel an invite by token.
   * Only org_owner, admin, and manager can cancel invites.
   */
  @Delete(':token')
  @Roles('org_owner', 'admin', 'manager')
  async cancelInvite(@Param('token') token: string) {
    return this.invitesService.cancelInvite(token);
  }
}
