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

    const { password: _, ...result } = user;
    return result;
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
  }
}

