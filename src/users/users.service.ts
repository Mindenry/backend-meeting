import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  findAll(includeSystem = false) {
    return this.prisma.user.findMany({
      where: includeSystem
        ? undefined
        : {
            role: {
              not: 'system',
            },
          },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    name: string;
    organizationId?: string;
    password?: string;
    role?: string;
  }) {
    // Get default organization if not provided
    let organizationId = data.organizationId;
    if (!organizationId) {
      const defaultOrg = await this.prisma.organization.findFirst();
      if (!defaultOrg) {
        throw new Error(
          'No organization found. Please create an organization first.',
        );
      }
      organizationId = defaultOrg.id;
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role || 'employee',
        organizationId,
      } as any, // Cast to any or appropriate type if schema is strict
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateStatus(id: string, data: { status?: string; activity?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    if (data.status) {
      this.eventsGateway.emitUserStatusChanged(id, data.status);
    }
    return user;
  }

  async remove(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async changePassword(id: string, passwords: any) {
    const { currentPassword, newPassword } = passwords;
    
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('รหัสผ่านปัจจุบันและรหัสผ่านใหม่จำเป็นต้องระบุ');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { success: true };
  }
}
