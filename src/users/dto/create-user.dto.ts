import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '../../common/decorators/swagger.decorators';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    type: String,
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org-123',
    type: String,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'User password (optional, will be auto-generated if not provided)',
    example: 'SecurePass123!',
    type: String,
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'User role',
    example: 'member',
    enum: ['admin', 'manager', 'member', 'viewer'],
    default: 'member',
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
