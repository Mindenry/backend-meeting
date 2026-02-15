import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  async createInvite(@Body() body: {
    email: string;
    organizationId: string;
    invitedBy: string;
    role?: string;
    teamId?: string;
    expiresInDays?: number;
  }) {
    const invite = await this.invitesService.createInvite(body);
    return {
      ...invite,
      inviteLink: `/invite?token=${invite.token}`,
    };
  }

  @Get('organization/:orgId')
  async getInvitesByOrganization(@Param('orgId') orgId: string) {
    return this.invitesService.getInvitesByOrganization(orgId);
  }

  @Get(':token')
  async getInvite(@Param('token') token: string) {
    return this.invitesService.getInviteByToken(token);
  }

  @Delete(':token')
  async cancelInvite(@Param('token') token: string) {
    return this.invitesService.cancelInvite(token);
  }
}

