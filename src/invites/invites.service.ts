import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  generateInviteToken(): string {
    return randomUUID() + '-' + Date.now().toString(36);
  }

  async createInvite(data: {
    email: string;
    organizationId: string;
    invitedBy: string;
    role?: string;
    teamId?: string;
    expiresInDays?: number;
  }) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Check if there's an unused invite for this email
    const existingInvite = await this.prisma.invite.findFirst({
      where: {
        email: data.email,
        organizationId: data.organizationId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      throw new BadRequestException('Active invite already exists for this email');
    }

    const expiresInDays = data.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await this.prisma.invite.create({
      data: {
        email: data.email,
        token: this.generateInviteToken(),
        organizationId: data.organizationId,
        invitedBy: data.invitedBy,
        role: data.role || 'employee',
        teamId: data.teamId,
        expiresAt,
      },
    });

    return invite;
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      return null;
    }

    if (invite.usedAt) {
      throw new BadRequestException('This invite has already been used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite has expired');
    }

    return invite;
  }

  async validateInvite(token: string) {
    const invite = await this.getInviteByToken(token);
    if (!invite) {
      throw new NotFoundException('Invalid invite token');
    }
    return invite;
  }

  async markAsUsed(token: string) {
    await this.prisma.invite.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  }

  async getInvitesByOrganization(organizationId: string) {
    return this.prisma.invite.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });
  }

  async cancelInvite(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Cannot cancel used invite');
    }

    await this.prisma.invite.delete({
      where: { token },
    });

    return { success: true };
  }
}

