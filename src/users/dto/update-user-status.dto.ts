import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({
    description: 'User status',
    example: 'active',
    enum: ['active', 'inactive', 'away', 'busy'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'User activity status',
    example: 'online',
    enum: ['online', 'offline', 'away'],
  })
  @IsOptional()
  @IsString()
  activity?: string;
}
