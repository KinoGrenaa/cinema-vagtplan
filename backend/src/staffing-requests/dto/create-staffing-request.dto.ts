import { StaffingRequestType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateStaffingRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shiftId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
  @Min(1)
  jobFunctionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
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
  @Min(1)
  cinemaId?: number;
}
