import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit.service';
import { GitService } from './git.service';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly gitService: GitService,
  ) {}

  // Repository Management
  async createRepository(data: {
    name: string;
    description?: string;
    url?: string;
    isPrivate?: boolean;
    teamId?: string;
    ownerId: string;
  }) {
    // Initialize Git repository first
    const repository = await this.prisma.repository.create({
      data: {
        name: data.name,
        description: data.description,
        url: data.url,
        isPrivate: data.isPrivate ?? true,
        teamId: data.teamId,
        ownerId: data.ownerId,
        defaultBranch: 'main',
        branches: {
          create: {
            name: 'main',
            isDefault: true,
          },
        },
      },
      include: {
        owner: true,
        team: true,
        branches: true,
      },
    });

    // Initialize actual Git repository
    try {
      await this.gitService.initRepository(repository.id);
    } catch (error) {
      // If Git init fails, delete the database record
      await this.prisma.repository.delete({ where: { id: repository.id } });
      throw new BadRequestException('Failed to initialize Git repository');
    }

    await this.auditService.log({
      action: 'create',
      entity: 'repository',
      entityId: repository.id,
      userId: data.ownerId,
      userName: repository.owner.name,
    });

    return repository;
  }

  async findAllRepositories(params?: {
    teamId?: string;
    ownerId?: string;
  }) {
    return this.prisma.repository.findMany({
      where: {
        teamId: params?.teamId || undefined,
        ownerId: params?.ownerId || undefined,
      },
      include: {
        owner: true,
        team: true,
        branches: true,
        _count: {
          select: {
            commits: true,
            pullRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRepository(id: string) {
    const repository = await this.prisma.repository.findUnique({
      where: { id },
      include: {
        owner: true,
        team: true,
        branches: true,
        commits: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            author: true,
          },
        },
        pullRequests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            creator: true,
            reviews: true,
            _count: {
              select: {
                comments: true,
              },
            },
          },
        },
      },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    return repository;
  }

  async updateRepository(
    id: string,
    data: {
      name?: string;
      description?: string;
      url?: string;
      isPrivate?: boolean;
    },
    userId: string,
  ) {
    const repository = await this.prisma.repository.update({
      where: { id },
      data,
      include: {
        owner: true,
      },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'repository',
      entityId: id,
      userId,
    });

    return repository;
  }

  async deleteRepository(id: string, userId: string) {
    await this.prisma.repository.delete({
      where: { id },
    });

    await this.auditService.log({
      action: 'delete',
      entity: 'repository',
      entityId: id,
      userId,
    });
  }

  // Branch Management
  async createBranch(data: {
    repositoryId: string;
    name: string;
    isDefault?: boolean;
  }) {
    return this.prisma.branch.create({
      data: {
        name: data.name,
        isDefault: data.isDefault ?? false,
        repositoryId: data.repositoryId,
      },
    });
  }

  async findAllBranches(repositoryId: string) {
    return this.prisma.branch.findMany({
      where: { repositoryId },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  // Commit Management
  async createCommit(data: {
    repositoryId: string;
    message: string;
    branch: string;
    authorId: string;
    files?: Array<{ path: string; content: string }>;
  }) {
    const author = await this.prisma.user.findUnique({
      where: { id: data.authorId },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Create files if provided
    if (data.files && data.files.length > 0) {
      for (const file of data.files) {
        const filePath = this.gitService.getRepoPath(data.repositoryId);
        const fullPath = path.join(filePath, file.path);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, file.content, 'utf-8');
      }
    }

    // Create actual Git commit
    const sha = await this.gitService.createCommit(
      data.repositoryId,
      data.message,
      author.name,
      author.email,
      data.files?.map(f => f.path)
    );

    // Get commit details from Git
    const gitCommits = await this.gitService.getCommits(data.repositoryId, data.branch, 1);
    const gitCommit = gitCommits[0];

    const commit = await this.prisma.commit.create({
      data: {
        sha: sha,
        message: data.message,
        branch: data.branch,
        repositoryId: data.repositoryId,
        authorId: data.authorId,
        filesChanged: data.files?.map(f => ({ path: f.path, additions: f.content.split('\n').length, deletions: 0 })),
      },
      include: {
        author: true,
        repository: {
          include: {
            team: true,
          },
        },
      },
    });

    // Notify team about new commit
    if (commit.repository.team && commit.repository.teamId) {
      this.eventsGateway.server
        .to(`team:${commit.repository.teamId}`)
        .emit('commit:created', commit);

      // Create notification for team members
      const teamMembers = await this.prisma.teamMember.findMany({
        where: { teamId: commit.repository.teamId },
        include: { user: true },
      });

      for (const member of teamMembers) {
        if (member.userId !== data.authorId) {
          await this.notificationsService.create({
            userId: member.userId,
            type: 'commit_created',
            title: 'New Commit',
            message: `${commit.author.name} pushed to ${commit.repository.name}`,
            relatedId: commit.id,
            relatedType: 'commit',
          });
        }
      }
    }

    return commit;
  }

  async findAllCommits(repositoryId: string, params?: {
    branch?: string;
    authorId?: string;
    limit?: number;
  }) {
    return this.prisma.commit.findMany({
      where: {
        repositoryId,
        branch: params?.branch || undefined,
        authorId: params?.authorId || undefined,
      },
      include: {
        author: true,
      },
      orderBy: { createdAt: 'desc' },
      take: params?.limit || 50,
    });
  }

  // Pull Request Management
  async createPullRequest(data: {
    repositoryId: string;
    title: string;
    description?: string;
    sourceBranch: string;
    targetBranch: string;
    creatorId: string;
  }) {
    // Get next PR number
    const lastPR = await this.prisma.pullRequest.findFirst({
      where: { repositoryId: data.repositoryId },
      orderBy: { number: 'desc' },
    });

    const prNumber = lastPR ? lastPR.number + 1 : 1;

    const pullRequest = await this.prisma.pullRequest.create({
      data: {
        title: data.title,
        description: data.description,
        number: prNumber,
        sourceBranch: data.sourceBranch,
        targetBranch: data.targetBranch,
        repositoryId: data.repositoryId,
        creatorId: data.creatorId,
      },
      include: {
        creator: true,
        repository: {
          include: {
            team: true,
          },
        },
      },
    });

    // Notify team
    if (pullRequest.repository.team && pullRequest.repository.teamId) {
      this.eventsGateway.server
        .to(`team:${pullRequest.repository.teamId}`)
        .emit('pullrequest:created', pullRequest);

      const teamMembers = await this.prisma.teamMember.findMany({
        where: { teamId: pullRequest.repository.teamId },
        include: { user: true },
      });

      for (const member of teamMembers) {
        if (member.userId !== data.creatorId) {
          await this.notificationsService.create({
            userId: member.userId,
            type: 'pullrequest_created',
            title: 'New Pull Request',
            message: `${pullRequest.creator.name} created PR #${prNumber}: ${pullRequest.title}`,
            relatedId: pullRequest.id,
            relatedType: 'pullrequest',
          });
        }
      }
    }

    await this.auditService.log({
      action: 'create',
      entity: 'pullrequest',
      entityId: pullRequest.id,
      userId: data.creatorId,
    });

    return pullRequest;
  }

  async findAllPullRequests(repositoryId: string, params?: {
    status?: string;
    creatorId?: string;
  }) {
    return this.prisma.pullRequest.findMany({
      where: {
        repositoryId,
        status: params?.status || undefined,
        creatorId: params?.creatorId || undefined,
      },
      include: {
        creator: true,
        reviews: {
          include: {
            reviewer: true,
          },
        },
        comments: {
          include: {
            author: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePullRequest(id: string) {
    const pr = await this.prisma.pullRequest.findUnique({
      where: { id },
      include: {
        creator: true,
        repository: true,
        reviews: {
          include: {
            reviewer: true,
          },
        },
        comments: {
          include: {
            author: true,
            replies: {
              include: {
                author: true,
              },
            },
          },
        },
        linkedTasks: true,
      },
    });

    if (!pr) {
      throw new NotFoundException('Pull request not found');
    }

    return pr;
  }

  async updatePullRequest(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: 'open' | 'merged' | 'closed';
    },
  ) {
    const updateData: any = { ...data };
    if (data.status === 'merged') {
      updateData.mergedAt = new Date();
    }

    return this.prisma.pullRequest.update({
      where: { id },
      data: updateData,
      include: {
        creator: true,
        repository: true,
      },
    });
  }

  // Pull Request Review
  async createReview(data: {
    pullRequestId: string;
    reviewerId: string;
    status: 'approved' | 'changes_requested' | 'commented';
    comment?: string;
  }) {
    const review = await this.prisma.pullRequestReview.upsert({
      where: {
        pullRequestId_reviewerId: {
          pullRequestId: data.pullRequestId,
          reviewerId: data.reviewerId,
        },
      },
      create: {
        pullRequestId: data.pullRequestId,
        reviewerId: data.reviewerId,
        status: data.status,
        comment: data.comment,
      },
      update: {
        status: data.status,
        comment: data.comment,
      },
      include: {
        reviewer: true,
        pullRequest: {
          include: {
            creator: true,
          },
        },
      },
    });

    // Notify PR creator
    if (review.pullRequest.creatorId !== data.reviewerId) {
      await this.notificationsService.create({
        userId: review.pullRequest.creatorId,
        type: 'pullrequest_reviewed',
        title: 'PR Reviewed',
        message: `${review.reviewer.name} ${data.status} your PR`,
        relatedId: data.pullRequestId,
        relatedType: 'pullrequest',
      });
    }

    this.eventsGateway.server
      .to(`pullrequest:${data.pullRequestId}`)
      .emit('review:created', review);

    return review;
  }

  // Code Comments
  async createCodeComment(data: {
    pullRequestId: string;
    authorId: string;
    content: string;
    filePath: string;
    lineNumber?: number;
    replyToId?: string;
  }) {
    const comment = await this.prisma.codeComment.create({
      data: {
        pullRequestId: data.pullRequestId,
        authorId: data.authorId,
        content: data.content,
        filePath: data.filePath,
        lineNumber: data.lineNumber,
        replyToId: data.replyToId,
      },
      include: {
        author: true,
        replyTo: {
          include: {
            author: true,
          },
        },
        replies: {
          include: {
            author: true,
          },
        },
      },
    });

    this.eventsGateway.server
      .to(`pullrequest:${data.pullRequestId}`)
      .emit('comment:created', comment);

    return comment;
  }

  async resolveCodeComment(id: string) {
    return this.prisma.codeComment.update({
      where: { id },
      data: { isResolved: true },
    });
  }

  // Link PR to Task
  async linkPullRequestToTask(prId: string, taskId: string) {
    return this.prisma.pullRequest.update({
      where: { id: prId },
      data: {
        linkedTasks: {
          connect: { id: taskId },
        },
      },
      include: {
        linkedTasks: true,
      },
    });
  }

  // Webhook Management
  async createWebhook(data: {
    repositoryId: string;
    url: string;
    events: string[];
    secret?: string;
  }) {
    return this.prisma.repositoryWebhook.create({
      data,
    });
  }

  async handleGitWebhook(repositoryId: string, payload: any) {
    // Handle incoming webhook from Git provider
    // This would be called by a webhook endpoint
    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new NotFoundException('Repository not found');
    }

    // Process webhook based on event type
    if (payload.ref) {
      // Push event - create commit
      await this.createCommit({
        repositoryId,
        message: payload.commits?.[0]?.message || 'Push',
        branch: payload.ref.replace('refs/heads/', ''),
        authorId: repository.ownerId, // You might want to map this properly
      });
    }

    return { success: true };
  }

  // File Management
  async getFiles(repositoryId: string, directory?: string) {
    const files = this.gitService.listFiles(repositoryId, directory);
    return files;
  }

  async getFileContent(repositoryId: string, filePath: string, branch?: string) {
    const content = this.gitService.getFileContent(repositoryId, filePath, branch);
    return { path: filePath, content };
  }

  async createFile(repositoryId: string, filePath: string, content: string, authorId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    await this.gitService.createFile(
      repositoryId,
      filePath,
      content,
      author.name,
      author.email
    );

    // Create commit
    const sha = await this.gitService.createCommit(
      repositoryId,
      `Add ${filePath}`,
      author.name,
      author.email,
      [filePath]
    );

    // Save to database
    await this.createCommit({
      repositoryId,
      message: `Add ${filePath}`,
      branch: 'main',
      authorId,
      files: [{ path: filePath, content }],
    });

    return { success: true, sha };
  }

  async updateFile(repositoryId: string, filePath: string, content: string, message: string, authorId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    const sha = await this.gitService.updateFile(
      repositoryId,
      filePath,
      content,
      author.name,
      author.email,
      message
    );

    // Save to database
    await this.createCommit({
      repositoryId,
      message: message || `Update ${filePath}`,
      branch: 'main',
      authorId,
      files: [{ path: filePath, content }],
    });

    return { success: true, sha };
  }

  async deleteFile(repositoryId: string, filePath: string, message: string, authorId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    const sha = await this.gitService.deleteFile(
      repositoryId,
      filePath,
      author.name,
      author.email,
      message
    );

    return { success: true, sha };
  }

  // Get file tree
  async getFileTree(repositoryId: string, branch?: string) {
    return this.gitService.getFileTree(repositoryId, branch);
  }
}
