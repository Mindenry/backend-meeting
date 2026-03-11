import { IsString, IsOptional } from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '../../common/decorators/swagger.decorators';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to receive the notification',
    example: 'user-123',
    type: String,
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    example: 'task_assigned',
    enum: [
      'task_assigned',
      'task_updated',
      'meeting_starting',
      'message_received',
      'mention',
      'announcement',
      'team_update',
    ],
    type: String,
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Task Assigned',
    type: String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example:
      'You have been assigned to "Implement user authentication feature"',
    type: String,
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Related entity ID (e.g., task ID, meeting ID)',
    example: 'task-456',
    type: String,
  })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiPropertyOptional({
    description: 'Related entity type',
    example: 'task',
    enum: ['task', 'meeting', 'message', 'team', 'announcement'],
    type: String,
  })
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({
    description: 'Link URL for the notification',
    example: '/tasks/task-456',
    type: String,
  })
  @IsOptional()
  @IsString()
  link?: string;
}
