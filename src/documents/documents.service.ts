import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // Folders
  async createFolder(data: {
    name: string;
    description?: string;
    parentId?: string;
    teamId?: string;
    createdBy: string;
  }) {
    const folder = await this.prisma.documentFolder.create({
      data,
      include: {
        team: true,
        creator: true,
        parent: true,
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'document_folder',
      entityId: folder.id,
      userId: data.createdBy,
      userName: folder.creator.name,
      details: { name: folder.name, teamId: folder.teamId },
    });

    return folder;
  }

  async getFolders(teamId?: string, parentId?: string) {
    return this.prisma.documentFolder.findMany({
      where: {
        teamId: teamId || undefined,
        parentId: parentId || null,
      },
      include: {
        team: true,
        creator: true,
        parent: true,
        children: true,
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFolder(id: string) {
    const folder = await this.prisma.documentFolder.findUnique({
      where: { id },
      include: {
        team: true,
        creator: true,
        parent: true,
        children: true,
        documents: {
          include: {
            creator: true,
            _count: {
              select: { versions: true },
            },
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  async updateFolder(id: string, data: { name?: string; description?: string }) {
    const exists = await this.prisma.documentFolder.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Folder not found');
    }

    const folder = await this.prisma.documentFolder.update({
      where: { id },
      data,
      include: { team: true, creator: true },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'document_folder',
      entityId: folder.id,
      userId: folder.createdBy,
      details: data,
    });

    return folder;
  }

  async deleteFolder(id: string) {
    const folder = await this.prisma.documentFolder.findUnique({
      where: { id },
      include: { documents: true, children: true },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.documents.length > 0 || folder.children.length > 0) {
      throw new ForbiddenException('Cannot delete folder with documents or subfolders');
    }

    await this.prisma.documentFolder.delete({ where: { id } });

    await this.auditService.log({
      action: 'delete',
      entity: 'document_folder',
      entityId: id,
      userId: folder.createdBy,
      details: { name: folder.name },
    });

    return { success: true };
  }

  // Documents
  async createDocument(data: {
    name: string;
    description?: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    folderId?: string;
    teamId?: string;
    createdBy: string;
  }) {
    const document = await this.prisma.document.create({
      data,
      include: {
        team: true,
        folder: true,
        creator: true,
      },
    });

    // Create initial version
    await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        createdBy: data.createdBy,
      },
    });

    // Give creator full permissions
    await this.prisma.documentPermission.create({
      data: {
        documentId: document.id,
        userId: data.createdBy,
        permission: 'delete',
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'document',
      entityId: document.id,
      userId: data.createdBy,
      userName: document.creator.name,
      details: { name: document.name, teamId: document.teamId },
    });

    return document;
  }

  async getDocuments(teamId?: string, folderId?: string, userId?: string) {
    const where: any = {
      isArchived: false,
    };

    if (teamId) where.teamId = teamId;
    if (folderId !== undefined) {
      where.folderId = folderId || null;
    }

    const documents = await this.prisma.document.findMany({
      where,
      include: {
        team: true,
        folder: true,
        creator: true,
        permissions: {
          ...(userId ? { where: { userId } } : {}),
        },
        _count: {
          select: { versions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by permissions if userId provided
    if (userId) {
      return documents.filter(doc => {
        const userPermission = doc.permissions?.find(p => p.userId === userId);
        return userPermission || doc.createdBy === userId;
      });
    }

    return documents;
  }

  async getDocument(id: string, userId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        team: true,
        folder: true,
        creator: true,
        versions: {
          orderBy: { version: 'desc' },
          include: {
            creator: true,
          },
        },
        permissions: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check permissions
    if (userId) {
      const userPermission = document.permissions.find(p => p.userId === userId);
      const hasAccess = userPermission || document.createdBy === userId;
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this document');
      }
    }

    return document;
  }

  async updateDocument(
    id: string,
    data: { name?: string; description?: string; folderId?: string },
    userId: string,
  ) {
    const document = await this.getDocument(id, userId);

    // Check edit permission
    const userPermission = document.permissions.find(p => p.userId === userId);
    const canEdit = userPermission?.permission === 'edit' || 
                    userPermission?.permission === 'delete' || 
                    document.createdBy === userId;

    if (!canEdit) {
      throw new ForbiddenException('You do not have permission to edit this document');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data,
      include: {
        team: true,
        folder: true,
        creator: true,
      },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'document',
      entityId: id,
      userId,
      details: data,
    });

    return updated;
  }

  async createVersion(
    documentId: string,
    data: {
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      changeNote?: string;
      createdBy: string;
    },
  ) {
    const document = await this.getDocument(documentId);

    // Check edit permission
    const userPermission = document.permissions.find(p => p.userId === data.createdBy);
    const canEdit = userPermission?.permission === 'edit' || 
                    userPermission?.permission === 'delete' || 
                    document.createdBy === data.createdBy;

    if (!canEdit) {
      throw new ForbiddenException('You do not have permission to create a new version');
    }

    const newVersion = document.version + 1;

    // Update document
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        version: newVersion,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });

    // Create version record
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId,
        version: newVersion,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        changeNote: data.changeNote,
        createdBy: data.createdBy,
      },
      include: {
        creator: true,
      },
    });

    await this.auditService.log({
      action: 'create',
      entity: 'document_version',
      entityId: version.id,
      userId: data.createdBy,
      details: { documentId, version: newVersion },
    });

    return version;
  }

  async archiveDocument(id: string, userId: string) {
    const document = await this.getDocument(id, userId);

    // Check delete permission
    const userPermission = document.permissions.find(p => p.userId === userId);
    const canDelete = userPermission?.permission === 'delete' || document.createdBy === userId;

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to archive this document');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { isArchived: true },
    });

    await this.auditService.log({
      action: 'archive',
      entity: 'document',
      entityId: id,
      userId,
      details: { name: document.name },
    });

    return updated;
  }

  // Permissions
  async setPermission(
    documentId: string,
    userId: string,
    permission: 'view' | 'edit' | 'delete',
    grantedBy: string,
  ) {
    const document = await this.getDocument(documentId, grantedBy);

    // Check if grantor has delete permission
    const grantorPermission = document.permissions.find(p => p.userId === grantedBy);
    const canGrant = grantorPermission?.permission === 'delete' || document.createdBy === grantedBy;

    if (!canGrant) {
      throw new ForbiddenException('You do not have permission to grant access');
    }

    const perm = await this.prisma.documentPermission.upsert({
      where: {
        documentId_userId: { documentId, userId },
      },
      update: { permission },
      create: {
        documentId,
        userId,
        permission,
      },
      include: {
        user: true,
      },
    });

    await this.auditService.log({
      action: 'update',
      entity: 'document_permission',
      entityId: perm.id,
      userId: grantedBy,
      details: { documentId, userId, permission },
    });

    return perm;
  }

  async removePermission(documentId: string, userId: string, removedBy: string) {
    const document = await this.getDocument(documentId, removedBy);

    // Check if remover has delete permission
    const removerPermission = document.permissions.find(p => p.userId === removedBy);
    const canRemove = removerPermission?.permission === 'delete' || document.createdBy === removedBy;

    if (!canRemove) {
      throw new ForbiddenException('You do not have permission to remove access');
    }

    await this.prisma.documentPermission.delete({
      where: {
        documentId_userId: { documentId, userId },
      },
    });

    await this.auditService.log({
      action: 'delete',
      entity: 'document_permission',
      entityId: `${documentId}-${userId}`,
      userId: removedBy,
      details: { documentId, userId },
    });

    return { success: true };
  }
}
