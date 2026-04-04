import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Task title',
    example: 'Update user authentication feature',
    type: String,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Update JWT-based authentication with refresh tokens',
    type: String,
  })
  @IsOptional()
  @ValidateIf((o) => o.description !== null)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Task priority',
    example: 'medium',
    enum: ['high', 'medium', 'low', 'urgent'],
  })
  @IsOptional()
  @IsEnum(['high', 'medium', 'low', 'urgent'])
  priority?: 'high' | 'medium' | 'low' | 'urgent';

  @ApiPropertyOptional({
    description: 'Task status',
    example: 'in_progress',
    enum: ['todo', 'in_progress', 'review', 'done'],
  })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'review', 'done'])
  status?: 'todo' | 'in_progress' | 'review' | 'done';

  @ApiPropertyOptional({
    description: 'Due date in ISO format',
    example: '2024-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({
    description: 'Task tags',
    example: ['frontend', 'backend'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Assignee user ID',
    example: 'user-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @ApiPropertyOptional({
    description: 'Team ID',
    example: 'team-456',
    type: String,
  })
  @IsOptional()
  @IsString()
  teamId?: string | null;

  @ApiPropertyOptional({
    description: 'Meeting ID',
    example: 'meeting-789',
    type: String,
  })
  @IsOptional()
  @IsString()
  meetingId?: string | null;

  @ApiPropertyOptional({
    description: 'Position in the column',
    example: 2,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiPropertyOptional({
    description: 'User ID',
    example: 'user-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional assignee user IDs for this task',
    example: ['user-234', 'user-345'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeIds?: string[];

  @ApiPropertyOptional({
    description: 'Whether this task is recurring',
    example: true,
    type: Boolean,
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
  @IsEnum(['daily', 'weekly', 'monthly'])
  recurringPattern?: 'daily' | 'weekly' | 'monthly' | null;

  @ApiPropertyOptional({
    description: 'Recurring interval (e.g. every 2 weeks)',
    example: 2,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  recurringInterval?: number | null;

  @ApiPropertyOptional({
    description: 'Recurring end date in ISO format',
    example: '2025-12-31T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: string | null;

  @ApiPropertyOptional({
    description: 'Task template ID to create task from',
    example: 'template-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  templateId?: string | null;
}
