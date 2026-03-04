import { IsString, IsOptional, IsEnum, IsArray, IsDateString, IsNumber, Min, Max, IsBoolean } from 'class-validator';
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
  @IsString()
  description?: string;

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
    description: 'Sprint ID',
    example: 'sprint-101',
    type: String,
  })
  @IsOptional()
  @IsString()
  sprintId?: string | null;

  @ApiPropertyOptional({
    description: 'Epic ID',
    example: 'epic-202',
    type: String,
  })
  @IsOptional()
  @IsString()
  epicId?: string | null;

  @ApiPropertyOptional({
    description: 'Story points',
    example: 8,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  storyPoints?: number | null;

  @ApiPropertyOptional({
    description: 'Time estimate in hours',
    example: 12,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimate?: number | null;

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
    description: 'Issue type',
    example: 'bug',
    enum: ['task', 'bug', 'story', 'epic', 'subtask'],
  })
  @IsOptional()
  @IsEnum(['task', 'bug', 'story', 'epic', 'subtask'])
  issueType?: 'task' | 'bug' | 'story' | 'epic' | 'subtask';

  @ApiPropertyOptional({
    description: 'Project ID',
    example: 'project-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  projectId?: string | null;

  @ApiPropertyOptional({
    description: 'Component ID',
    example: 'component-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  componentId?: string | null;

  @ApiPropertyOptional({
    description: 'Version ID',
    example: 'version-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  versionId?: string | null;

  @ApiPropertyOptional({
    description: 'Reporter user ID',
    example: 'user-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  reporterId?: string | null;

  @ApiPropertyOptional({
    description: 'Resolution',
    example: 'done',
    enum: ['done', 'wont_fix', 'duplicate', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['done', 'wont_fix', 'duplicate', 'cancelled'])
  resolution?: string | null;

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
