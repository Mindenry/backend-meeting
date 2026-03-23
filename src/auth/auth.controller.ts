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
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvitesService } from '../invites/invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from '../common/dto/login.dto';
import { RefreshTokenDto } from '../common/dto/refresh-token.dto';
import { SetPasswordDto } from '../common/dto/set-password.dto';
import { ResetPasswordDto } from '../common/dto/reset-password.dto';
import {
  ForgotPasswordDto,
  ResetPasswordTokenDto,
} from '../common/dto/forgot-password.dto';
import { AuditService } from '../common/audit.service';

// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '../common/decorators/swagger.decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly invitesService: InvitesService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and receive access token and refresh token',
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    try {
      this.logger.debug(`Login attempt for email: ${loginDto.email}`);

      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
        loginDto.rememberMe ?? false,
      );

      this.logger.debug('Auth service login result:', {
        hasResult: !!result,
        hasUser: !!result?.user,
        userId: result?.user?.id,
      });

      // Check if result and user exist
      if (!result) {
        this.logger.error('Login failed: No response from auth service');
        throw new Error('Login failed: No response from auth service');
      }

      if (!result.user) {
        this.logger.error('Login failed: User data missing in response', {
          result,
        });
        throw new Error('Login failed: User data missing in response');
      }

      if (!result.user.id) {
        this.logger.error('Login failed: User ID missing', {
          user: result.user,
        });
        throw new Error('Login failed: User ID missing');
      }

      this.logger.log(`Login successful for user: ${result.user.id}`);

      // Derive client IP (prefer X-Forwarded-For when behind proxies like ngrok)
      const forwardedFor = req?.headers?.['x-forwarded-for'] as
        | string
        | string[]
        | undefined;
      const clientIp = forwardedFor
        ? (Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0]
          ).trim()
        : req?.ip || null;

      // Audit log for successful login
      try {
        await this.auditService.log({
          action: 'login',
          entity: 'user',
          entityId: result.user.id,
          userId: result.user.id,
          userName: result.user.name,
          details: {
            email: result.user.email,
          },
          ipAddress: clientIp,
          userAgent: req?.headers?.['user-agent'],
        });
      } catch (e) {
        this.logger.error('Failed to write login audit log', e);
      }

      // Log full response for debugging
      this.logger.debug(
        'Login response:',
        JSON.stringify({
          hasAccessToken: !!result.accessToken,
          hasRefreshToken: !!result.refreshToken,
          hasUser: !!result.user,
          userId: result.user?.id,
          userEmail: result.user?.email,
        }),
      );

      return result;
    } catch (error) {
      this.logger.error('Login error:', error);
      // Re-throw with better error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Login failed: ${error}`);
    }
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using refresh token',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() refreshTokenDto: RefreshTokenDto, @Request() req) {
    const result = await this.authService.logout(refreshTokenDto.refreshToken);

    // Best-effort audit log for logout
    try {
      const userId = req?.user?.id;
      const forwardedFor = req?.headers?.['x-forwarded-for'] as
        | string
        | string[]
        | undefined;
      const clientIp = forwardedFor
        ? (Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0]
          ).trim()
        : req?.ip || null;
      await this.auditService.log({
        action: 'logout',
        entity: 'user',
        entityId: userId || 'unknown',
        userId: userId ?? undefined,
        userName: req?.user?.name,
        details: {
          email: req?.user?.email,
        },
        ipAddress: clientIp,
        userAgent: req?.headers?.['user-agent'],
      });
    } catch (e) {
      this.logger.error('Failed to write logout audit log', e);
    }

    return result;
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
      firstName?: string;
      lastName?: string;
      department?: string;
      position?: string;
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

    // Mark invite as used
    await this.invitesService.markAsUsed(body.token);

    // Auto-add to team (priority: body.teamId > invite.teamId)
    const loginResult = await this.authService.login(
      invite.email,
      body.password,
    );
    const userId = loginResult.user.id;
    const teamId = body.teamId || invite.teamId;

    if (teamId) {
      await this.prisma.teamMember.upsert({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
        update: {
          role: invite.teamRole || 'member',
        },
        create: {
          userId,
          teamId,
          role: invite.teamRole || 'member',
        },
      });
    }

    // Update the user with the work-related fields directly
    try {
      // Derive name parts
      const explicitFirst = body.firstName?.trim();
      const explicitLast = body.lastName?.trim();
      const [fallbackFirst, ...rest] = (body.name || '').trim().split(' ');
      const firstName = explicitFirst || fallbackFirst || 'New';
      const lastName = explicitLast || rest.join(' ') || 'Member';
      const displayName = `${firstName} ${lastName}`.trim();

      // Department & Position
      const department = body.department?.trim() || 'General';

      // Position: from form if provided, otherwise default to 'Employee'
      // Do NOT derive from org role — that causes confusion when viewing team members
      const position = body.position?.trim() || 'Employee';

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          displayName,
          department,
          position,
          managerId: invite.invitedBy, // Manager = ผู้ที่ส่งคำเชิญ
        },
      });
    } catch (e) {
      this.logger.error('Failed to update user profile on invite accept', e);
    }

    // Return same structure as login (accessToken, refreshToken, user)
    return loginResult;
  }

  @Post('set-password')
  async setPassword(@Body() setPasswordDto: SetPasswordDto) {
    await this.authService.setPassword(
      setPasswordDto.userId,
      setPasswordDto.password,
    );
    return { success: true };
  }

  @Patch('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.userId,
      resetPasswordDto.oldPassword,
      resetPasswordDto.newPassword,
    );
    return { success: true };
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset link to user email.',
  })
  @ApiResponse({ status: 200, description: 'Reset instructions sent.' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password-token')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Sets a new password using reset token.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  async resetPasswordWithToken(@Body() resetDto: ResetPasswordTokenDto) {
    return this.authService.resetPasswordWithToken(
      resetDto.token,
      resetDto.newPassword,
    );
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

  /**
   * Look up an active invite by email.
   * This is used by the self-service invite setup flow where users enter
   * their email instead of following a tokenized link.
   */
  @Post('invite/lookup')
  async lookupInviteByEmail(
    @Body()
    body: {
      email: string;
    },
  ) {
    const rawEmail = body?.email?.trim();
    if (!rawEmail) {
      throw new BadRequestException('Email is required');
    }

    const email = rawEmail.toLowerCase();

    const invite = await this.prisma.invite.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invite) {
      throw new NotFoundException('No active invite for this email');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: invite.organizationId },
    });

    return {
      token: invite.token,
      email: invite.email,
      organization: org?.name,
      role: invite.role,
      teamId: invite.teamId,
    };
  }
}
