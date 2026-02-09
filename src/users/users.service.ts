import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) { }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateStatus(
    id: string,
    data: { status?: string; currentRoom?: string | null; activity?: string },
  ) {
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
    if (data.currentRoom !== undefined) {
      this.eventsGateway.emitUserRoomChanged(id, data.currentRoom);
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
}


