import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
// @ts-ignore - Optional Swagger decorators
import {
  ApiTags,
  ApiBearerAuth,
} from '../common/decorators/swagger.decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { DriveService } from './drive.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

// Mirror the uploaded file type used by UploadController
interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

// Common MIME types for better detection
const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  // Videos
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  aac: 'audio/aac',
  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  rtf: 'application/rtf',
  // Archives
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  // Code/Dev
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'application/typescript',
  py: 'text/x-python',
  java: 'text/x-java-source',
  c: 'text/x-c',
  cpp: 'text/x-c++',
  h: 'text/x-c',
  md: 'text/markdown',
  yml: 'application/x-yaml',
  yaml: 'application/x-yaml',
  // Other
  exe: 'application/vnd.microsoft.portable-executable',
  dmg: 'application/x-apple-diskimage',
  iso: 'application/x-iso9660-image',
};

// Get MIME type from file extension
function getMimeType(filename: string, fallback?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPE_MAP[ext] || fallback || 'application/octet-stream';
}

@ApiTags('drive')
@Controller('drive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DriveController {
  constructor(
    private readonly driveService: DriveService,
    private readonly storageService: StorageService,
  ) {}

  @Get('teams/:teamId')
  listEntries(@Param('teamId') teamId: string, @Query('path') path?: string) {
    return this.driveService.listEntries(teamId, path || '/');
  }

  @Post('teams/:teamId/folders')
  createFolder(
    @Param('teamId') teamId: string,
    @Body() body: { name: string; path?: string; createdById: string },
  ) {
    return this.driveService.createFolder(
      teamId,
      body.createdById,
      body.name,
      body.path || '/',
    );
  }

  @Post('teams/:teamId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB - support larger files like Google Drive
      },
    }),
  )
  async uploadFile(
    @Param('teamId') teamId: string,
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: { path?: string; createdById?: string },
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Security hardening: prefer authenticated user id over client-provided createdById
    const createdById =
      (req?.user?.id as string | undefined) || body.createdById;
    if (!createdById) {
      throw new BadRequestException('Unable to determine uploader identity');
    }

    // Enforce per-file upload limit 500MB (like Google Drive)
    const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 500MB limit');
    }

    // Use our MIME type detection for better accuracy (like Google Drive)
    const detectedMimeType = getMimeType(file.originalname, file.mimetype);
    console.log(
      `[Drive] Uploading file: ${file.originalname} (${detectedMimeType}, ${file.size} bytes)`,
    );

    const { entry, version, url } = await this.driveService.saveFileVersion({
      teamId,
      createdById,
      originalName: file.originalname,
      path: body.path || '/',
      storageKey: file.filename,
      size: file.size,
      mimeType: detectedMimeType,
    });

    return {
      entryId: entry.id,
      name: entry.name,
      path: entry.path,
      isFolder: entry.isFolder,
      latestVersion: {
        id: version.id,
        version: version.version,
        size: version.size,
        mimeType: version.mimeType,
        url,
      },
    };
  }

  @Get('entries/:id/versions')
  getEntryVersions(@Param('id') id: string) {
    return this.driveService.getEntryWithVersions(id);
  }

  @Delete('entries/:id')
  deleteEntry(@Param('id') id: string) {
    return this.driveService.deleteEntry(id);
  }

  @Get('entries/:id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.driveService.getPermissions(id);
  }

  @Post('entries/:id/permissions')
  addPermission(
    @Param('id') id: string,
    @Body() body: { userId: string; permission: string },
  ) {
    if (!body.userId || !body.permission) {
      throw new BadRequestException('userId and permission are required');
    }
    return this.driveService.addPermission(id, body.userId, body.permission);
  }

  @Delete('entries/:id/permissions/:userId')
  removePermission(@Param('id') id: string, @Param('userId') userId: string) {
    return this.driveService.removePermission(id, userId);
  }
}
