import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

    const { password: _, ...result } = user;
    return result;
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
}

