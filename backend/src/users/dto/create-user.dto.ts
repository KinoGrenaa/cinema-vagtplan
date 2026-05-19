import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

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

  @IsInt()
  cinemaId: number;
}