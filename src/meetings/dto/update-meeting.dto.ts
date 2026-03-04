import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class UpdateMeetingDto {
  @ApiPropertyOptional({
    description: 'Meeting title',
    example: 'Updated Team Standup Meeting',
    type: String,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Meeting description',
    example: 'Updated daily standup to discuss progress and blockers',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Meeting start time in ISO format',
    example: '2024-12-20T11:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Meeting end time in ISO format',
    example: '2024-12-20T11:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Enable waiting room',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @ApiPropertyOptional({
    description: 'Allow screen sharing',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  allowScreenShare?: boolean;

  @ApiPropertyOptional({
    description: 'Meeting status',
    example: 'live',
    enum: ['upcoming', 'live', 'ended', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Team ID',
    example: 'team-456',
    type: String,
  })
  @IsOptional()
  @IsString()
  teamId?: string | null;
}
