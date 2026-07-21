import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SHIFT_NOTE_MAX_LENGTH } from '../helpers/shift-input';

export class UpdateShiftDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number | null;

  @IsInt()
  @Min(1)
  workTypeId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cinemaId?: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(SHIFT_NOTE_MAX_LENGTH)
  note?: string | null;
}
