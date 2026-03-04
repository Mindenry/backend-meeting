import { IsString } from 'class-validator';
import { ApiProperty } from '../../common/decorators/swagger.decorators';

export class MarkReadDto {
  @ApiProperty({
    description: 'User ID marking the message as read',
    example: 'user-123',
    type: String,
  })
  @IsString()
  userId: string;
}
