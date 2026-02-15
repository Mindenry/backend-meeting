import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

// กำหนด interface สำหรับ uploaded file
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

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  uploadFile(@UploadedFile() file: UploadedFileType | undefined) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // Return the accessible URL
    const fileUrl = `/uploads/${file.filename}`;
    return {
      url: fileUrl,
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}

