import { IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '../decorators/swagger.decorators';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-123',
    type: String,
  })
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
    type: String,
  })
  @IsString({ message: 'Old password must be a string' })
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @ApiProperty({
    description: 'New password (must contain uppercase, lowercase, number, and special character)',
    example: 'NewPassword123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'New password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'New password must contain at least one number' })
  @Matches(/[!@#$%^&*]/, { message: 'New password must contain at least one special character (!@#$%^&*)' })
  newPassword: string;

  @ApiPropertyOptional({
    description: 'Reset token (optional)',
    example: 'reset-token-123',
    type: String,
  })
  @IsString({ message: 'Token must be a string' })
  @IsOptional()
  token?: string;
}
