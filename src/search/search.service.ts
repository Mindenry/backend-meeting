import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  type: 'task' | 'message' | 'meeting' | 'user' | 'team' | 'document';
  id: string;
  title: string;
  description?: string;
  url: string;
  metadata?: any;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(
    query: string,
    userId: string,
    options?: {
      types?: string[];
      limit?: number;
      teamId?: string;
    },
  ): Promise<SearchResult[]> {
    const limit = options?.limit || 20;
    const types = options?.types || [
      'task',
      'message',
      'meeting',
      'user',
      'team',
      'document',
    ];
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
      return [];
    }

    const results: SearchResult[] = [];

    // Get user's organization and teams
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teams: {
          include: { team: true },
        },
        organization: true,
      },
    });

    if (!user) {
      return [];
    }

    const userTeamIds = user.teams.map((tm) => tm.teamId);
    const organizationId = user.organizationId;

    // Search Tasks
    if (types.includes('task')) {
      const tasks = await this.prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { has: searchTerm } },
          ],
          AND: [
            {
              OR: [
                { teamId: { in: userTeamIds } },
                { assigneeId: userId },
                { teamId: null }, // Public tasks
              ],
            },
          ],
        },
        take: limit,
        include: {
          assignee: true,
          team: true,
        },
      });

      tasks.forEach((task) => {
        results.push({
          type: 'task',
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          url: `/tasks?task=${task.id}`,
          metadata: {
            status: task.status,
            priority: task.priority,
            assignee: task.assignee?.name,
            team: task.team?.name,
          },
        });
      });
    }

    // Search Messages
    if (types.includes('message')) {
      const messages = await this.prisma.message.findMany({
        where: {
          text: { contains: searchTerm, mode: 'insensitive' },
          channel: {
            team: {
              id: { in: userTeamIds },
            },
          },
        },
        take: limit,
        include: {
          sender: true,
          channel: {
            include: { team: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      messages.forEach((message) => {
        results.push({
          type: 'message',
          id: message.id,
          title: `Message in ${message.channel.name}`,
          description: message.text.substring(0, 200),
          url: `/chat?channel=${message.channelId}&message=${message.id}`,
          metadata: {
            sender: message.sender.name,
            channel: message.channel.name,
            team: message.channel.team.name,
            createdAt: message.createdAt,
          },
        });
      });
    }

    // Search Meetings
    if (types.includes('meeting')) {
      const meetings = await this.prisma.meeting.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
          AND: [
            {
              OR: [
                { teamId: { in: userTeamIds } },
                { hostId: userId },
                { teamId: null }, // Public meetings
              ],
            },
          ],
        },
        take: limit,
        include: {
          host: true,
          team: true,
        },
        orderBy: { startTime: 'desc' },
      });

      meetings.forEach((meeting) => {
        results.push({
          type: 'meeting',
          id: meeting.id,
          title: meeting.title,
          description: meeting.description || undefined,
          url: `/meetings/${meeting.id}`,
          metadata: {
            host: meeting.host.name,
            team: meeting.team?.name,
            startTime: meeting.startTime,
            status: meeting.status,
          },
        });
      });
    }

    // Search Users
    if (types.includes('user')) {
      const users = await this.prisma.user.findMany({
        where: {
          organizationId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
          id: { not: userId }, // Exclude self
        },
        take: limit,
      });

      users.forEach((user) => {
        results.push({
          type: 'user',
          id: user.id,
          title: user.name,
          description: user.email,
          url: `/teams?user=${user.id}`,
          metadata: {
            email: user.email,
            role: user.role,
            status: user.status,
          },
        });
      });
    }

    // Search Teams
    if (types.includes('team')) {
      const teams = await this.prisma.team.findMany({
        where: {
          organizationId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
          members: {
            some: {
              userId,
            },
          },
        },
        take: limit,
      });

      teams.forEach((team) => {
        results.push({
          type: 'team',
          id: team.id,
          title: team.name,
          description: team.description || undefined,
          url: `/teams/${team.id}`,
          metadata: {
            createdAt: team.createdAt,
          },
        });
      });
    }

    // Search Documents
    if (types.includes('document')) {
      const documents = await this.prisma.document.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
          AND: [
            {
              OR: [
                { teamId: { in: userTeamIds } },
                { teamId: null }, // Public documents
              ],
            },
          ],
          isArchived: false,
        },
        take: limit,
        include: {
          creator: true,
          team: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      documents.forEach((doc) => {
        results.push({
          type: 'document',
          id: doc.id,
          title: doc.name,
          description: doc.description || undefined,
          url: `/documents/${doc.id}`,
          metadata: {
            creator: doc.creator.name,
            team: doc.team?.name,
            mimeType: doc.mimeType,
            updatedAt: doc.updatedAt,
          },
        });
      });
    }

    // Sort by relevance (simple: prioritize exact matches in title)
    results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(searchTerm);
      const bTitleMatch = b.title.toLowerCase().includes(searchTerm);
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      return 0;
    });

    return results.slice(0, limit);
  }
}
