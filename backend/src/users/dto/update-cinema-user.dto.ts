import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  CinemaRole,
  EmploymentType,
} from '@prisma/client';

export class UpdateCinemaUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(CinemaRole)
  role: CinemaRole;

  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @IsOptional()
  @IsDateString()
  hireDate?: string | null;

  @IsOptional()
  @IsString()
  employeeNumber?: string | null;

  @IsOptional()
  @IsString()
  payrollEmployeeId?: string | null;

  @IsBoolean()
  canManageSchedule: boolean;

  @IsBoolean()
  canManageUsers: boolean;

  @IsBoolean()
  canManagePayroll: boolean;

  @IsBoolean()
  canManageLeaveRequests: boolean;

  @IsBoolean()
  canManageCinemaSettings: boolean;

  @IsBoolean()
  canSendBroadcastMessages: boolean;
}
