import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateShiftDto {
  @IsInt()
  userId: number;

  @IsInt()
  workTypeId: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  note?: string | null;
}