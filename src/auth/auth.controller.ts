import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvitesService } from '../invites/invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitesService: InvitesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; name: string }) {
    return this.authService.register(body.email, body.password, body.name);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    const { password: _, ...user } = req.user;
    return user;
  }

  // Remote methods

  @Post('invite/accept')
  async acceptInvite(
    @Body()
    body: {
      token: string;
      name: string;
      password: string;
      teamId?: string;
    },
  ) {
    const invite = await this.invitesService.validateInvite(body.token);

    const org = await this.prisma.organization.findUnique({
      where: { id: invite.organizationId },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Create user
    const hashedPassword = await this.authService.hashPassword(body.password);
    const user = await this.prisma.user.create({
      data: {
        email: invite.email,
        name: body.name,
        password: hashedPassword,
        role: invite.role,
        organizationId: invite.organizationId,
        isActive: true,
      },
    });

    // Add to team if specified
    if (body.teamId) {
      await this.prisma.teamMember.create({
        data: {
          userId: user.id,
          teamId: body.teamId,
          role: 'member',
        },
      });
    }

    // Mark invite as used
    await this.invitesService.markAsUsed(body.token);

    // Auto-login after accept
    // We can just return the user for now, or generate tokens. 
    // To match Remote, we return user.
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  @Post('set-password')
  async setPassword(@Body() body: { userId: string; password: string }) {
    await this.authService.setPassword(body.userId, body.password);
    return { success: true };
  }

  @Patch('reset-password')
  async resetPassword(
    @Body()
    body: {
      userId: string;
      oldPassword: string;
      newPassword: string;
      token?: string; // Optional token if we implement password recovery
    },
  ) {
    await this.authService.resetPassword(
      body.userId,
      body.oldPassword,
      body.newPassword,
    );
    return { success: true };
  }

  @Get('invite/:token')
  async getInvite(@Param('token') token: string) {
    const invite = await this.invitesService.getInviteByToken(token);
    if (!invite) {
      throw new Error('Invalid or expired invite');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: invite.organizationId },
    });

    return {
      email: invite.email,
      organization: org?.name,
      role: invite.role,
      teamId: invite.teamId,
    };
  }
}
