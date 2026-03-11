import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTaskId(taskId: string, limit = 50) {
    return this.prisma.taskActivityLog.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async log(data: {
    taskId: string;
    userId?: string;
    action: string;
    oldValue?: string;
    newValue?: string;
  }) {
    return this.prisma.taskActivityLog.create({ data });
  }

  async logMany(
    entries: Array<{
      taskId: string;
      userId?: string;
      action: string;
      oldValue?: string;
      newValue?: string;
    }>,
  ) {
    if (entries.length === 0) return;
    return this.prisma.taskActivityLog.createMany({ data: entries });
  }
}
