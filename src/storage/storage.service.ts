import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

// File interface to avoid Express.Multer.File dependency
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'cloudinary';
  localPath?: string;
  s3?: {
    bucket: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  gcs?: {
    bucket: string;
    projectId: string;
    keyFilename?: string;
  };
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder?: string;
    url?: string; // Alternative: CLOUDINARY_URL format
  };
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimetype: string;
  provider: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private config: StorageConfig;

  constructor(private configService: ConfigService) {
    const provider = (this.configService.get('STORAGE_PROVIDER') as any) || 'local';
    
    this.config = {
      provider,
      localPath: this.configService.get('STORAGE_LOCAL_PATH') || './uploads',
      s3: {
        bucket: this.configService.get('S3_BUCKET') || '',
        region: this.configService.get('S3_REGION') || 'us-east-1',
        accessKeyId: this.configService.get('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY'),
      },
      cloudinary: {
        cloudName: this.configService.get('CLOUDINARY_CLOUD_NAME') || '',
        apiKey: this.configService.get('CLOUDINARY_API_KEY') || '',
        apiSecret: this.configService.get('CLOUDINARY_API_SECRET') || '',
        folder: this.configService.get('CLOUDINARY_FOLDER') || 'team-connect',
        url: this.configService.get('CLOUDINARY_URL') || '', // Alternative: use CLOUDINARY_URL instead
      },
    };

    // Validate provider configuration and fallback to local if incomplete
    if (provider !== 'local' && !this.isProviderConfigured(provider)) {
      this.logger.warn(
        `Storage provider "${provider}" is not fully configured. Falling back to local storage.`,
      );
      this.config.provider = 'local';
    }
  }

  private isProviderConfigured(provider: string): boolean {
    switch (provider) {
      case 's3':
        return !!(
          this.config.s3?.bucket &&
          this.config.s3?.accessKeyId &&
          this.config.s3?.secretAccessKey
        );
      case 'cloudinary':
        // Support both CLOUDINARY_URL and separate credentials
        return !!(
          this.config.cloudinary?.url ||
          (this.config.cloudinary?.cloudName &&
            this.config.cloudinary?.apiKey &&
            this.config.cloudinary?.apiSecret)
        );
      case 'local':
        return true;
      default:
        return false;
    }
  }

  async uploadFile(
    file: UploadedFile,
    folder?: string,
  ): Promise<UploadResult> {
    switch (this.config.provider) {
      case 's3':
        return this.uploadToS3(file, folder);
      case 'gcs':
        return this.uploadToGCS(file, folder);
      case 'cloudinary':
        return this.uploadToCloudinary(file, folder);
      case 'local':
      default:
        return this.uploadToLocal(file, folder);
    }
  }

  async deleteFile(key: string): Promise<void> {
    switch (this.config.provider) {
      case 's3':
        return this.deleteFromS3(key);
      case 'gcs':
        return this.deleteFromGCS(key);
      case 'cloudinary':
        return this.deleteFromCloudinary(key);
      case 'local':
      default:
        return this.deleteFromLocal(key);
    }
  }

  private async uploadToLocal(
    file: UploadedFile,
    folder?: string,
  ): Promise<UploadResult> {
    const uploadDir = folder
      ? path.join(this.config.localPath!, folder)
      : this.config.localPath!;

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    const filepath = path.join(uploadDir, filename);

    await fs.writeFile(filepath, file.buffer);

    const url = folder ? `/uploads/${folder}/${filename}` : `/uploads/${filename}`;
    return {
      url,
      key: folder ? `${folder}/${filename}` : filename,
      size: file.size,
      mimetype: file.mimetype,
      provider: 'local',
    };
  }

  private async deleteFromLocal(key: string): Promise<void> {
    const filepath = path.join(this.config.localPath!, key);
    try {
      await fs.unlink(filepath);
    } catch (error) {
      this.logger.warn(`Failed to delete local file: ${key}`, error);
    }
  }

  private async uploadToS3(
    file: UploadedFile,
    folder?: string,
  ): Promise<UploadResult> {
    try {
      // Dynamic import to avoid requiring AWS SDK if not using S3
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

      const s3Client = new S3Client({
        region: this.config.s3!.region,
        credentials: this.config.s3!.accessKeyId
          ? {
              accessKeyId: this.config.s3!.accessKeyId,
              secretAccessKey: this.config.s3!.secretAccessKey!,
            }
          : undefined, // Use IAM role if credentials not provided
      });

      const ext = path.extname(file.originalname);
      const key = folder
        ? `${folder}/${uniqueSuffix}${ext}`
        : `${uniqueSuffix}${ext}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.config.s3!.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read', // Or use bucket policy
        }),
      );

      const url = `https://${this.config.s3!.bucket}.s3.${this.config.s3!.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        size: file.size,
        mimetype: file.mimetype,
        provider: 's3',
      };
    } catch (error) {
      this.logger.error('S3 upload failed, falling back to local', error);
      // Fallback to local storage
      return this.uploadToLocal(file, folder);
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

      const s3Client = new S3Client({
        region: this.config.s3!.region,
        credentials: this.config.s3!.accessKeyId
          ? {
              accessKeyId: this.config.s3!.accessKeyId,
              secretAccessKey: this.config.s3!.secretAccessKey!,
            }
          : undefined,
      });

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.config.s3!.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete S3 file: ${key}`, error);
    }
  }

  private async uploadToGCS(
    file: UploadedFile,
    folder?: string,
  ): Promise<UploadResult> {
    // Google Cloud Storage implementation
    // Similar to S3 but using GCS SDK
    this.logger.warn('GCS storage not yet implemented, falling back to local');
    return this.uploadToLocal(file, folder);
  }

  private async deleteFromGCS(key: string): Promise<void> {
    this.logger.warn('GCS delete not yet implemented');
  }

  // Cloudinary upload (Free tier: 25GB storage, 25GB bandwidth/month)
  private async uploadToCloudinary(
    file: UploadedFile,
    folder?: string,
  ): Promise<UploadResult> {
    try {
      const cloudinary = await import('cloudinary').then(m => m.v2);
      
      // Support CLOUDINARY_URL format (easier - just copy from dashboard)
      if (this.config.cloudinary?.url) {
        cloudinary.config({
          cloudinary_url: this.config.cloudinary.url,
        });
      } else if (
        this.config.cloudinary?.cloudName &&
        this.config.cloudinary?.apiKey &&
        this.config.cloudinary?.apiSecret
      ) {
        // Support separate credentials
        cloudinary.config({
          cloud_name: this.config.cloudinary.cloudName,
          api_key: this.config.cloudinary.apiKey,
          api_secret: this.config.cloudinary.apiSecret,
        });
      } else {
        throw new Error(
          'Cloudinary credentials are not configured. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET',
        );
      }

      const uploadPath = folder
        ? `${this.config.cloudinary.folder}/${folder}/${Date.now()}`
        : `${this.config.cloudinary.folder}/${Date.now()}`;

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: uploadPath,
            resource_type: 'auto', // auto-detect image, video, raw
            public_id: file.originalname.replace(/\.[^/.]+$/, ''), // remove extension
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        key: result.public_id,
        size: file.size,
        mimetype: file.mimetype,
        provider: 'cloudinary',
      };
    } catch (error) {
      this.logger.error('Cloudinary upload failed, falling back to local', error);
      return this.uploadToLocal(file, folder);
    }
  }

  private async deleteFromCloudinary(key: string): Promise<void> {
    try {
      const cloudinary = await import('cloudinary').then(m => m.v2);
      await cloudinary.uploader.destroy(key);
    } catch (error) {
      this.logger.error(`Failed to delete Cloudinary file: ${key}`, error);
    }
  }

}
