import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, teamId?: string) {
    return this.prisma.wikiArticle.findMany({
      where: {
        OR: [
          { isPublic: true },
          { teamId: teamId || undefined },
          { createdBy: userId },
          {
            permissions: {
              some: {
                OR: [
                  { userId },
                  { teamId: teamId || undefined },
                ],
              },
            },
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
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const article = await this.prisma.wikiArticle.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        permissions: {
          select: {
            userId: true,
            permission: true,
          },
        },
        comments: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Check permissions
    const hasAccess =
      article.isPublic ||
      article.createdBy === userId ||
      article.permissions.some((p) => p.userId === userId);

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return article;
  }

  async create(data: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    teamId?: string;
    createdBy: string;
  }) {
    return this.prisma.wikiArticle.create({
      data: {
        title: data.title,
        content: data.content,
        category: data.category || null,
        tags: data.tags || [],
        isPublic: data.isPublic ?? true,
        teamId: data.teamId || null,
        createdBy: data.createdBy,
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

  async update(id: string, userId: string, data: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    const article = await this.prisma.wikiArticle.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can update this article');
    }

    // Create new version
    const newVersion = article.version + 1;
    await this.prisma.wikiArticleVersion.create({
      data: {
        articleId: id,
        version: article.version,
        title: article.title,
        content: article.content,
        createdBy: userId,
      },
    });

    return this.prisma.wikiArticle.update({
      where: { id },
      data: {
        ...data,
        version: newVersion,
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

  async delete(id: string, userId: string) {
    const article = await this.prisma.wikiArticle.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can delete this article');
    }

    return this.prisma.wikiArticle.delete({
      where: { id },
    });
  }

  async incrementViewCount(id: string) {
    return this.prisma.wikiArticle.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  }

  async addComment(articleId: string, userId: string, content: string) {
    return this.prisma.wikiComment.create({
      data: {
        articleId,
        content,
        createdBy: userId,
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
