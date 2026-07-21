import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const LEAVE_REQUEST_REASON_MAX_LENGTH = 1000;

export class CreateLeaveRequestDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(LEAVE_REQUEST_REASON_MAX_LENGTH)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cinemaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;
}
