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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { InvitesService } from '../invites/invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from '../common/dto/login.dto';
import { RegisterDto } from '../common/dto/register.dto';
import { RefreshTokenDto } from '../common/dto/refresh-token.dto';
import { SetPasswordDto } from '../common/dto/set-password.dto';
import { ResetPasswordDto } from '../common/dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly invitesService: InvitesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      this.logger.debug(`Login attempt for email: ${loginDto.email}`);
      
      const result = await this.authService.login(loginDto.email, loginDto.password);
      
      this.logger.debug('Auth service login result:', { 
        hasResult: !!result, 
        hasUser: !!result?.user,
        userId: result?.user?.id 
      });
      
      // Check if result and user exist
      if (!result) {
        this.logger.error('Login failed: No response from auth service');
        throw new Error('Login failed: No response from auth service');
      }
      
      if (!result.user) {
        this.logger.error('Login failed: User data missing in response', { result });
        throw new Error('Login failed: User data missing in response');
      }
      
      if (!result.user.id) {
        this.logger.error('Login failed: User ID missing', { user: result.user });
        throw new Error('Login failed: User ID missing');
      }

      this.logger.log(`Login successful for user: ${result.user.id}`);
      
      // Log full response for debugging
      this.logger.debug('Login response:', JSON.stringify({
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        hasUser: !!result.user,
        userId: result.user?.id,
        userEmail: result.user?.email,
      }));
      
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


  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto.email, registerDto.password, registerDto.name);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
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
  async setPassword(@Body() setPasswordDto: SetPasswordDto) {
    await this.authService.setPassword(setPasswordDto.userId, setPasswordDto.password);
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
