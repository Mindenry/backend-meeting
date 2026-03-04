import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';

@Injectable()
export class VersionsService {
  constructor(private prisma: PrismaService) {}

  create(createVersionDto: CreateVersionDto) {
    return this.prisma.version.create({
      data: createVersionDto,
    });
  }

  findAll(teamId?: string) {
    return this.prisma.version.findMany({
      where: teamId ? { teamId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.version.findUnique({
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

  update(id: string, updateVersionDto: UpdateVersionDto) {
    return this.prisma.version.update({
      where: { id },
      data: updateVersionDto,
    });
  }

  remove(id: string) {
    return this.prisma.version.delete({
      where: { id },
    });
  }
}
