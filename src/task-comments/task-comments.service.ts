import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(taskId: string, userId: string, text: string) {
    // Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        text,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Create activity log
    await this.prisma.taskActivityLog.create({
      data: {
        taskId,
        userId,
        action: 'comment_added',
        newValue: text.substring(0, 100), // Store first 100 chars
      },
    });

    return comment;
  }

  async getByTask(taskId: string) {
    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(commentId: string, userId: string, text: string) {
    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new NotFoundException('You can only edit your own comments');
    }

    return this.prisma.taskComment.update({
      where: { id: commentId },
      data: { text },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new NotFoundException('You can only delete your own comments');
    }

    await this.prisma.taskComment.delete({
      where: { id: commentId },
    });

    return { success: true };
  }
}
