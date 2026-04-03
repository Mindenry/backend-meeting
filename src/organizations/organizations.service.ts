import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrganizationCreateInput) {
    return this.prisma.organization.create({ data });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            teams: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            teams: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput) {
    const exists = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException('Organization not found');
    }

    console.log('Updating organization with data:', JSON.stringify(data, null, 2));
    console.log('Settings to save:', JSON.stringify(data.settings, null, 2));

    const result = await this.prisma.organization.update({
      where: { id },
      data,
    });

    console.log('Updated organization result:', JSON.stringify(result, null, 2));
    return result;
  }

  async remove(id: string) {
    const exists = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.organization.delete({ where: { id } });
    return { success: true };
  }
}
