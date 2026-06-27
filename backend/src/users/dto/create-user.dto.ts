import {
  IsBoolean,
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
  @MinLength(8, { message: 'Adgangskode skal være mindst 8 tegn.' })
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

  @IsOptional()
  @IsInt()
  cinemaId?: number | null;

  @IsOptional()
  @IsEnum(['HOURLY', 'SALARIED'])
  employmentType?: 'HOURLY' | 'SALARIED';

  @IsOptional()
  @IsBoolean()
  canManageSchedule?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  canManagePayroll?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageLeaveRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageCinemaSettings?: boolean;

  @IsOptional()
  @IsBoolean()
  canSendBroadcastMessages?: boolean;
}
