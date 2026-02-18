import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EpicsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teamId?: string) {
    return this.prisma.epic.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.epic.findUnique({
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
    color?: string;
    teamId: string;
    createdById: string;
  }) {
    return this.prisma.epic.create({
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
    color?: string;
    status: string;
  }>) {
    const exists = await this.prisma.epic.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Epic not found');

    return this.prisma.epic.update({
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
    const exists = await this.prisma.epic.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Epic not found');
    await this.prisma.epic.delete({ where: { id } });
    return { success: true };
  }
}
