import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { extname } from 'path';

@Injectable()
export class DriveService {
  constructor(private readonly prisma: PrismaService) {}

  async listEntries(teamId: string, path: string = '/') {
    const normalizedPath = this.normalizePath(path);

    const entries = await this.prisma.driveEntry.findMany({
      where: {
        teamId,
        path: normalizedPath,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { isFolder: 'desc' },
        { name: 'asc' },
      ],
    });

    return entries.map((e) => ({
      id: e.id,
      name: e.name,
      path: e.path,
      isFolder: e.isFolder,
      latestVersion: e.versions[0]
        ? {
            id: e.versions[0].id,
            version: e.versions[0].version,
            size: e.versions[0].size,
            mimeType: e.versions[0].mimeType,
            storageKey: e.versions[0].storageKey,
            url: `/uploads/${e.versions[0].storageKey}`,
          }
        : null,
      updatedAt: e.updatedAt,
    }));
  }

  async createFolder(teamId: string, createdById: string, name: string, path: string = '/') {
    const normalizedPath = this.normalizePath(path);
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new BadRequestException('Folder name is required');
    }

    // Prevent duplicate folder names in same path
    const existing = await this.prisma.driveEntry.findFirst({
      where: {
        teamId,
        path: normalizedPath,
        name: trimmedName,
        isFolder: true,
      },
    });
    if (existing) {
      throw new BadRequestException('Folder with this name already exists in this path');
    }

    return this.prisma.driveEntry.create({
      data: {
        teamId,
        createdById,
        name: trimmedName,
        path: normalizedPath,
        isFolder: true,
      },
    });
  }

  async saveFileVersion(params: {
    teamId: string;
    createdById: string;
    originalName: string;
    path?: string;
    storageKey: string;
    size: number;
    mimeType: string;
  }) {
    // 5GB total storage limit check per organization
    const MAX_STORAGE_BYTES = 5368709120; // 5 * 1024 * 1024 * 1024

    // First, find the organization this team belongs to
    const team = await this.prisma.team.findUnique({
      where: { id: params.teamId },
      select: { organizationId: true }
    });

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Calculate total storage used by all teams in this organization
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId: team.organizationId },
      select: { id: true }
    });
    const orgTeamIds = orgTeams.map(t => t.id);

    const usageResult = await this.prisma.driveFileVersion.aggregate({
      where: {
        entry: {
          teamId: { in: orgTeamIds }
        }
      },
      _sum: {
        size: true
      }
    });

    const currentUsedBytes = usageResult._sum.size || 0;
    if (currentUsedBytes + params.size > MAX_STORAGE_BYTES) {
      throw new BadRequestException('Organization storage limit exceeded (5GB maximum)');
    }

    const normalizedPath = this.normalizePath(params.path || '/');
    const fileName = params.originalName;

    // Find or create logical entry for this file (per team + path + name)
    let entry = await this.prisma.driveEntry.findFirst({
      where: {
        teamId: params.teamId,
        path: normalizedPath,
        name: fileName,
        isFolder: false,
      },
    });

    if (!entry) {
      entry = await this.prisma.driveEntry.create({
        data: {
          teamId: params.teamId,
          createdById: params.createdById,
          name: fileName,
          path: normalizedPath,
          isFolder: false,
        },
      });
    }

    const latest = await this.prisma.driveFileVersion.findFirst({
      where: { entryId: entry.id },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const version = await this.prisma.driveFileVersion.create({
      data: {
        entryId: entry.id,
        version: nextVersion,
        storageKey: params.storageKey,
        mimeType: params.mimeType,
        size: params.size,
        createdById: params.createdById,
      },
    });

    // Touch entry updatedAt for ordering
    await this.prisma.driveEntry.update({
      where: { id: entry.id },
      data: { updatedAt: new Date() },
    });

    return {
      entry,
      version,
      url: `/uploads/${version.storageKey}`,
    };
  }

  async getEntryWithVersions(id: string) {
    const entry = await this.prisma.driveEntry.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
    if (!entry) {
      throw new NotFoundException('Drive entry not found');
    }

    return {
      id: entry.id,
      name: entry.name,
      path: entry.path,
      isFolder: entry.isFolder,
      versions: entry.versions.map((v) => ({
        id: v.id,
        version: v.version,
        size: v.size,
        mimeType: v.mimeType,
        storageKey: v.storageKey,
        url: `/uploads/${v.storageKey}`,
        createdAt: v.createdAt,
      })),
    };
  }

  private normalizePath(path: string) {
    if (!path || path === '/') return '/';
    let p = path.trim();
    if (!p.startsWith('/')) p = `/${p}`;
    if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1);
    return p;
  }

  // Convenience helper to derive content type when needed on frontend
  guessTypeFromName(name: string) {
    const ext = extname(name).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return 'image';
    if (['.pdf'].includes(ext)) return 'pdf';
    if (['.mp4', '.mov', '.webm'].includes(ext)) return 'video';
    return 'file';
  }
}

