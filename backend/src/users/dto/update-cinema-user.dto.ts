import {
  IsBoolean,
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
