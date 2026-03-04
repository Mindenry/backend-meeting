import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TaskWatchersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async watch(taskId: string, userId: string) {
    // Upsert — idempotent
    return this.prisma.taskWatcher.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { taskId, userId },
      update: {},
    });
  }

  async unwatch(taskId: string, userId: string) {
    try {
      await this.prisma.taskWatcher.delete({
        where: { taskId_userId: { taskId, userId } },
      });
      return { unwatched: true };
    } catch {
      return { unwatched: false };
    }
  }

  async getWatchers(taskId: string) {
    return this.prisma.taskWatcher.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } },
      },
    });
  }

  async isWatching(taskId: string, userId: string): Promise<boolean> {
    const watcher = await this.prisma.taskWatcher.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });
    return !!watcher;
  }

  /**
   * Auto-watch: add user as watcher if not already watching.
   * Used when a user is assigned, comments, etc.
   */
  async autoWatch(taskId: string, userId: string) {
    try {
      await this.prisma.taskWatcher.upsert({
        where: { taskId_userId: { taskId, userId } },
        create: { taskId, userId },
        update: {},
      });
    } catch {
      // Silently ignore — user might already be watching
    }
  }

  /**
   * Notify all watchers of a task about a change.
   * Excludes the actor who performed the change.
   */
  async notifyWatchers(
    taskId: string,
    actorId: string,
    notification: { type: string; title: string; message: string },
  ) {
    const watchers = await this.prisma.taskWatcher.findMany({
      where: { taskId },
      select: { userId: true },
    });

    const watcherIds = watchers
      .map((w) => w.userId)
      .filter((id) => id !== actorId);

    if (watcherIds.length === 0) return;

    await this.notificationsService.createForUsers(watcherIds, {
      ...notification,
      link: `/tasks?taskId=${taskId}`,
    });
  }
}
