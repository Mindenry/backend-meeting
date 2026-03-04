import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@Injectable()
export class ComponentsService {
  constructor(private prisma: PrismaService) {}

  create(createComponentDto: CreateComponentDto) {
    return this.prisma.component.create({
      data: createComponentDto,
    });
  }

  findAll(teamId?: string) {
    return this.prisma.component.findMany({
      where: teamId ? { teamId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.component.findUnique({
      where: { id },
      include: {
        team: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });
  }

  update(id: string, updateComponentDto: UpdateComponentDto) {
    return this.prisma.component.update({
      where: { id },
      data: updateComponentDto,
    });
  }

  remove(id: string) {
    return this.prisma.component.delete({
      where: { id },
    });
  }
}
