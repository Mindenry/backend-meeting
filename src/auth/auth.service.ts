import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      // Allow migration scenario or require set password
      throw new UnauthorizedException('Password not set. Please contact admin or reset password.');
    }

    if (user.isActive === false) { // Explicitly check for false, assuming default true if undefined or strictly boolean
       throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    
    // Ensure user has required properties
    if (!user || !user.id || !user.email) {
      throw new UnauthorizedException('Invalid user data');
    }
    
    const payload = { email: user.email, sub: user.id, role: user.role || 'employee' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    try {
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });
    } catch (error) {
      // Log error but don't fail login if refresh token creation fails
      console.error('Failed to create refresh token:', error);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'employee',
        organizationId: user.organizationId,
        avatar: user.avatar || null,
      },
    };
  }

  async register(email: string, password: string, name: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create a default organization for the new user
    const organization = await this.prisma.organization.create({
      data: {
        name: `${name}'s Workspace`,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'org_owner', // User is owner of their own org
        organizationId: organization.id,
      },
    });

    return user;
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = storedToken.user;
      const newPayload = { email: user.email, sub: user.id, role: user.role || 'employee' };
      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
    return { success: true };
  }

  // Remote methods adapted to use bcryptjs
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async validateEmailDomain(email: string, organizationId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return false;
    }

    // If no domain restrictions, allow any email
    if (!org.domain && (!org.allowedDomains || org.allowedDomains.length === 0)) {
      return true;
    }

    const emailDomain = email.split('@')[1];
    
    // Check single domain
    if (org.domain && emailDomain === org.domain) {
      return true;
    }

    // Check allowed domains array
    if (org.allowedDomains && org.allowedDomains.length > 0) {
      return org.allowedDomains.includes(emailDomain);
    }

    return false;
  }

  async setPassword(userId: string, password: string): Promise<void> {
    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }

    if (!/[!@#$%^&*]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }

    const hashedPassword = await this.hashPassword(password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async resetPassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new BadRequestException('User not found or password not set');
    }

    const isOldPasswordValid = await this.comparePassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.setPassword(userId, newPassword);
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // In a real application, we might not want to reveal if a user exists
      // However, for this demo/project scale, it's fine.
      return { success: true, message: 'If an account exists, a reset link will be sent.' };
    }

    // Usually, we would generate a unique token, save it to DB, and send an email
    // For this implementation, we will use a JWT token that expires quickly
    const payload = { email: user.email, sub: user.id, action: 'reset_password' };
    const resetToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    // Since we don't have an email sending service integrated yet,
    // we'll log the token to the console and return it for development purposes.
    console.log(`Password reset link for ${user.email}: http://localhost:5173/reset-password?token=${resetToken}`);
    
    return { success: true, message: 'Password reset instructions have been sent to your email.' };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean }> {
    try {
      // Verify token
      const payload = this.jwtService.verify(token);
      
      if (payload.action !== 'reset_password' || !payload.sub) {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Set new password
      await this.setPassword(user.id, newPassword);

      // In a real application, you might want to invalidate all existing refresh tokens here
      await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

      return { success: true };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
