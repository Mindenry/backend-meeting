import { IsString, IsOptional, IsArray, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class CreateMeetingMinutesDto {
  @ApiProperty({
    description: 'Meeting ID',
    example: 'meeting-uuid',
  })
  @IsUUID()
  meetingId: string;

  @ApiProperty({
    description: 'Minutes title',
    example: 'Weekly Team Standup Minutes',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Minutes content in Markdown format',
    example: '## Agenda\n- Discuss sprint progress\n- Review blockers\n\n## Notes\n...',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Action items as JSON array',
    example: [{ task: 'Follow up on API issue', assignee: 'John', dueDate: '2024-01-15' }],
  })
  @IsOptional()
  actionItems?: any;

  @ApiPropertyOptional({
    description: 'Decisions made as JSON array',
    example: [{ decision: 'Move to new API architecture', date: '2024-01-10' }],
  })
  @IsOptional()
  decisions?: any;

  @ApiPropertyOptional({
    description: 'User IDs of attendees',
    example: ['user-uuid-1', 'user-uuid-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];
}

export class UpdateMeetingMinutesDto {
  @ApiPropertyOptional({
    description: 'Minutes title',
    example: 'Updated Meeting Minutes',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Minutes content in Markdown format',
    example: '## Updated Agenda\n...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Action items as JSON array',
  })
  @IsOptional()
  actionItems?: any;

  @ApiPropertyOptional({
    description: 'Decisions made as JSON array',
  })
  @IsOptional()
  decisions?: any;

  @ApiPropertyOptional({
    description: 'User IDs of attendees',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];
}
