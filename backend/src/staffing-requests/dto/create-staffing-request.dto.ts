import { StaffingRequestType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateStaffingRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  shiftId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetUserId?: number;

  @IsEnum(StaffingRequestType)
  type: StaffingRequestType;

  @IsOptional()
  @IsDateString()
  requestStartTime?: string;

  @IsOptional()
  @IsDateString()
  requestEndTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workTypeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cinemaId?: number;
}
