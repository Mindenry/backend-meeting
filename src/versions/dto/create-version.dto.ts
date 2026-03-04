import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsDateString } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  released?: boolean;

  @IsDateString()
  @IsOptional()
  releaseDate?: string;

  @IsString()
  @IsNotEmpty()
  teamId: string;
}
