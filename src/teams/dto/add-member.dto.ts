import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class AddMemberDto {
  @ApiProperty({
    description: 'User ID to add to the team',
    example: 'user-456',
    type: String,
  })
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: 'Member role in the team',
    example: 'member',
    enum: ['lead', 'member'],
    default: 'member',
  })
  @IsOptional()
  @IsString()
  role?: string;
}
