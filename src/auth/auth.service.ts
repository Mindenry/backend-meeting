import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
<<<<<<< HEAD
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
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // If user doesn't have a password set, allow login for existing users (migration scenario)
      if (!user.password) {
        // For existing users without password, you might want to set a default password
        // or require them to reset it. For now, we'll reject.
        throw new UnauthorizedException('Password not set. Please contact admin.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Validate user error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(email: string, password: string) {
    try {
      const user = await this.validateUser(email, password);
      
      const payload = { email: user.email, sub: user.id, role: user.role || 'member' };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'member',
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(email: string, password: string, name: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'member',
      },
    });

=======
import { PrismaService } from '../prisma/prisma.service';

// Try to import bcrypt, fallback if not available
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  console.warn('⚠️  bcrypt not found. Password hashing will use placeholder method.');
  bcrypt = null;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async hashPassword(password: string): Promise<string> {
    if (bcrypt) {
      const saltRounds = 10;
      return bcrypt.hash(password, saltRounds);
    }
    // Fallback placeholder hash (NOT SECURE - for development only)
    return `$2b$10$placeholder${Buffer.from(password).toString('base64')}`;
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    // Handle placeholder hash from seed (development only)
    if (hash.startsWith('$2b$10$placeholder')) {
      // Extract original password from placeholder hash
      const originalPassword = Buffer.from(hash.replace('$2b$10$placeholder', ''), 'base64').toString();
      return password === originalPassword;
    }
    
    if (bcrypt) {
      return bcrypt.compare(password, hash);
    }
    
    // Fallback: direct comparison (NOT SECURE - for development only)
    console.warn('⚠️  Using insecure password comparison. Please install bcrypt.');
    return password === hash;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Please set your password first');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700
    const { password: _, ...result } = user;
    return result;
  }

<<<<<<< HEAD
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
      const newPayload = { email: user.email, sub: user.id, role: user.role || 'member' };
      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
    return { success: true };
=======
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
>>>>>>> fcc8e9c8dda5a4d582d762cef59437d32dbac700
  }
}

