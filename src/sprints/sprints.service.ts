import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teamId?: string) {
    return this.prisma.sprint.findMany({
      where: teamId ? { teamId } : {},
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async create(data: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    goal?: string;
    teamId: string;
    createdById: string;
  }) {
    return this.prisma.sprint.create({
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    goal?: string;
    status: string;
  }>) {
    const exists = await this.prisma.sprint.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Sprint not found');

    return this.prisma.sprint.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.sprint.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Sprint not found');
    await this.prisma.sprint.delete({ where: { id } });
    return { success: true };
  }
}
