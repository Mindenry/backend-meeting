import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { StorageService, UploadedFile as StorageUploadedFile } from './storage/storage.service';
import { AuditService } from './common/audit.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Use memory storage to get buffer for cloud storage
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: any | undefined,
    @Query('folder') folder?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Convert to StorageUploadedFile format
    const storageFile: StorageUploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      destination: file.destination,
      filename: file.filename,
      path: file.path,
    };

    // Upload to configured storage (local, S3, etc.)
    const result = await this.storageService.uploadFile(storageFile, folder);

    // Log audit trail
    if (req?.user) {
      await this.auditService.log({
        action: 'upload',
        entity: 'file',
        entityId: result.key,
        userId: req.user.id,
        userName: req.user.name,
        details: {
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          provider: result.provider,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    return {
      url: result.url,
      key: result.key,
      name: file.originalname,
      size: result.size,
      mimetype: result.mimetype,
      provider: result.provider,
    };
  }
}

