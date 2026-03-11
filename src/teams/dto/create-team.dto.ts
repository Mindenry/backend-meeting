import { IsString, IsOptional, MinLength } from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '../../common/decorators/swagger.decorators';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Team name',
    example: 'Frontend Development Team',
    type: String,
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    description: 'Team description',
    example: 'Responsible for frontend development and UI/UX implementation',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
