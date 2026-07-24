import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CinemaRole,
  EmploymentType,
} from '@prisma/client';

export class UserCinemaMembershipConfigurationDto {
  @IsInt()
  @Min(1)
  cinemaId: number;

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

export class ReplaceUserCinemaMembershipsDto {
  @IsArray()
  @ArrayUnique(
    (membership: UserCinemaMembershipConfigurationDto) =>
      membership.cinemaId,
  )
  @ValidateNested({ each: true })
  @Type(
    () => UserCinemaMembershipConfigurationDto,
  )
  memberships: UserCinemaMembershipConfigurationDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultCinemaId?: number | null;
}
