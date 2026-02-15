import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Folders
  @Post('folders')
  createFolder(
    @Body()
    body: {
      name: string;
      description?: string;
      parentId?: string;
      teamId?: string;
      createdBy: string;
    },
  ) {
    return this.documentsService.createFolder(body);
  }

  @Get('folders')
  getFolders(
    @Query('teamId') teamId?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.documentsService.getFolders(teamId, parentId);
  }

  @Get('folders/:id')
  getFolder(@Param('id') id: string) {
    return this.documentsService.getFolder(id);
  }

  @Patch('folders/:id')
  updateFolder(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.documentsService.updateFolder(id, body);
  }

  @Delete('folders/:id')
  deleteFolder(@Param('id') id: string) {
    return this.documentsService.deleteFolder(id);
  }

  // Documents
  @Post()
  createDocument(
    @Body()
    body: {
      name: string;
      description?: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      folderId?: string;
      teamId?: string;
      createdBy: string;
    },
  ) {
    return this.documentsService.createDocument(body);
  }

  @Get()
  getDocuments(
    @Query('teamId') teamId?: string,
    @Query('folderId') folderId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.documentsService.getDocuments(teamId, folderId, userId);
  }

  @Get(':id')
  getDocument(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.documentsService.getDocument(id, userId);
  }

  @Patch(':id')
  updateDocument(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; folderId?: string; userId: string },
  ) {
    const { userId, ...data } = body;
    return this.documentsService.updateDocument(id, data, userId);
  }

  @Post(':id/versions')
  createVersion(
    @Param('id') documentId: string,
    @Body()
    body: {
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      changeNote?: string;
      createdBy: string;
    },
  ) {
    return this.documentsService.createVersion(documentId, body);
  }

  @Patch(':id/archive')
  archiveDocument(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.documentsService.archiveDocument(id, body.userId);
  }

  // Permissions
  @Post(':id/permissions')
  setPermission(
    @Param('id') documentId: string,
    @Body()
    body: {
      userId: string;
      permission: 'view' | 'edit' | 'delete';
      grantedBy: string;
    },
  ) {
    return this.documentsService.setPermission(
      documentId,
      body.userId,
      body.permission,
      body.grantedBy,
    );
  }

  @Delete(':id/permissions/:userId')
  removePermission(
    @Param('id') documentId: string,
    @Param('userId') userId: string,
    @Body() body: { removedBy: string },
  ) {
    return this.documentsService.removePermission(documentId, userId, body.removedBy);
  }
}
