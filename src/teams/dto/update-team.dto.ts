import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class UpdateTeamDto {
  @ApiPropertyOptional({
    description: 'Team name',
    example: 'Updated Frontend Team',
    type: String,
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
