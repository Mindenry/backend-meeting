import { IsEmail, IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john.doe.updated@example.com',
    type: String,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe Updated',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL',
    example: 'https://example.com/avatar.png',
    type: String,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'User role',
    example: 'manager',
    enum: ['admin', 'manager', 'member', 'viewer'],
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'User department',
    example: 'Engineering',
    type: String,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'User position/job title',
    example: 'Frontend Developer',
    type: String,
  })
  @IsOptional()
  @IsString()
  position?: string;
}
