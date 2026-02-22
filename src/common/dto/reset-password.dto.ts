import { IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @IsString({ message: 'Old password must be a string' })
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'New password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'New password must contain at least one number' })
  @Matches(/[!@#$%^&*]/, { message: 'New password must contain at least one special character (!@#$%^&*)' })
  newPassword: string;

  @IsString({ message: 'Token must be a string' })
  @IsOptional()
  token?: string;
}
