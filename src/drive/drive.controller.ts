import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DriveService } from './drive.service';

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

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get('teams/:teamId')
  listEntries(
    @Param('teamId') teamId: string,
    @Query('path') path?: string,
  ) {
    return this.driveService.listEntries(teamId, path || '/');
  }

  @Post('teams/:teamId/folders')
  createFolder(
    @Param('teamId') teamId: string,
    @Body() body: { name: string; path?: string; createdById: string },
  ) {
    return this.driveService.createFolder(teamId, body.createdById, body.name, body.path || '/');
  }

  @Post('teams/:teamId/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(
    @Param('teamId') teamId: string,
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: { path?: string; createdById: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { entry, version, url } = await this.driveService.saveFileVersion({
      teamId,
      createdById: body.createdById,
      originalName: file.originalname,
      path: body.path || '/',
      storageKey: file.filename,
      size: file.size,
      mimeType: file.mimetype,
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
}

