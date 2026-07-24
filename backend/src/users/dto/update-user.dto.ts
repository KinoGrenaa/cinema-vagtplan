import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum([
    'MASTER',
  ])
  role?: 'MASTER';

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message:
      'Adgangskode skal være mindst 8 tegn.',
  })
  password?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
