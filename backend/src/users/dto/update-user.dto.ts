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
  @IsEnum(['MASTER', 'ADMIN', 'EMPLOYEE'])
  role?: 'MASTER' | 'ADMIN' | 'EMPLOYEE';

  @IsOptional()
  @IsString()
  @MinLength(6)
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
  hireDate?: string | null;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}