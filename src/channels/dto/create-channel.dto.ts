import { IsString, IsOptional, MinLength } from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '../../common/decorators/swagger.decorators';

export class CreateChannelDto {
  @ApiProperty({
    description: 'Channel name',
    example: 'general',
    type: String,
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Channel type',
    example: 'public',
    enum: ['public', 'private', 'direct'],
    default: 'public',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Channel description',
    example: 'General discussion channel for all team members',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Team ID that owns this channel',
    example: 'team-789',
    type: String,
  })
  @IsString()
  teamId: string;
}
