import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class UpdateMessageDto {
  @ApiPropertyOptional({
    description: 'Updated message text',
    example: 'Updated message content here',
    type: String,
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'Pin/unpin the message',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
