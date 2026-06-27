import {
  IsBoolean,
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
  @MinLength(8, { message: 'Adgangskode skal være mindst 8 tegn.' })
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
