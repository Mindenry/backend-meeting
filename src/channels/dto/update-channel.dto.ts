import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class UpdateChannelDto {
  @ApiPropertyOptional({
    description: 'Channel name',
    example: 'updated-general',
    type: String,
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: 'Channel type',
    example: 'private',
    enum: ['public', 'private', 'direct'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Channel description',
    example: 'Updated description for the channel',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
