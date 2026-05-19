import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class ManualTimeEntryDto {
  @IsInt()
  userId: number;

  @IsInt()
  cinemaId: number;

  @IsInt()
  shiftId: number;

  @IsString()
  clockIn: string;

  @IsString()
  clockOut: string;

  @IsOptional()
  @IsString()
  note?: string;
}