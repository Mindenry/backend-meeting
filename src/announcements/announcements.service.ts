import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, userRole?: string, teamIds?: string[]) {
    const now = new Date();
    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: 'active',
        AND: [
          {
            OR: [
              { targetType: 'all' },
              ...(userRole
                ? [{ targetType: 'role', targetIds: { has: userRole } }]
                : []),
              ...(teamIds && teamIds.length > 0
                ? [{ targetType: 'team', targetIds: { hasSome: teamIds } }]
                : []),
              { targetType: 'user', targetIds: { has: userId } },
            ],
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        reads: {
          where: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return announcements.map((announcement) => ({
      ...announcement,
      isRead: announcement.reads.length > 0,
    }));
  }

  async findOne(id: string, userId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Mark as read
    await this.prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId,
        },
      },
      create: {
        announcementId: id,
        userId,
      },
      update: {},
    });

    return announcement;
  }

  async create(data: {
    title: string;
    content: string;
    priority: string;
    targetType: string;
    targetIds?: string[];
    expiresAt?: Date;
    createdBy: string;
  }) {
    return this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetType: data.targetType,
        targetIds: data.targetIds || [],
        expiresAt: data.expiresAt || null,
        createdBy: data.createdBy,
        status: 'active',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
