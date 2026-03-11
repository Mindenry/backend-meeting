import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '../../common/decorators/swagger.decorators';

export class AttachmentDto {
  @ApiProperty({
    description: 'Attachment URL',
    example: 'https://example.com/files/document.pdf',
    type: String,
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Attachment name',
    example: 'document.pdf',
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Attachment MIME type',
    example: 'application/pdf',
    type: String,
  })
  @IsString()
  type: string;
}

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message text content',
    example: 'Hello team! This is an important update.',
    type: String,
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    description: 'Sender user ID',
    example: 'user-123',
    type: String,
  })
  @IsString()
  senderId: string;

  @ApiPropertyOptional({
    description: 'ID of the message this is replying to',
    example: 'msg-456',
    type: String,
  })
  @IsOptional()
  @IsString()
  replyToId?: string;

  @ApiPropertyOptional({
    description: 'Message attachments',
    example: [
      {
        url: 'https://example.com/files/image.png',
        name: 'image.png',
        type: 'image/png',
      },
      {
        url: 'https://example.com/files/document.pdf',
        name: 'document.pdf',
        type: 'application/pdf',
      },
    ],
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: Array<{ url: string; name: string; type: string }>;

  @ApiPropertyOptional({
    description: 'Array of user IDs mentioned in the message',
    example: ['user-123', 'user-456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}
