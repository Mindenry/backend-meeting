import { IsString, IsOptional, IsBoolean, IsArray, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class CreateMeetingDto {
  @ApiProperty({
    description: 'Meeting title',
    example: 'Team Standup Meeting',
    type: String,
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Meeting description',
    example: 'Daily standup to discuss progress and blockers',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Meeting start time in ISO format',
    example: '2024-12-20T10:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Meeting end time in ISO format',
    example: '2024-12-20T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Meeting password',
    example: 'secure123',
    type: String,
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Enable waiting room',
    example: true,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @ApiPropertyOptional({
    description: 'Allow screen sharing',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowScreenShare?: boolean;

  @ApiPropertyOptional({
    description: 'Meeting status',
    example: 'upcoming',
    enum: ['upcoming', 'live', 'ended', 'cancelled'],
    default: 'upcoming',
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

  @ApiProperty({
    description: 'Host user ID',
    example: 'user-123',
    type: String,
  })
  @IsString()
  hostId: string;

  @ApiPropertyOptional({
    description: 'Is recurring meeting',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurring pattern',
    example: 'weekly',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @IsOptional()
  @IsString()
  recurringPattern?: string;

  @ApiPropertyOptional({
    description: 'Recurring days (0=Sunday, 1=Monday, etc.)',
    example: [1, 3, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  recurringDays?: number[];

  @ApiPropertyOptional({
    description: 'Recurring end date in ISO format',
    example: '2025-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;
}
