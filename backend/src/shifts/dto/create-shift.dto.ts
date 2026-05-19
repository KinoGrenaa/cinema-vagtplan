import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateShiftDto {
  @IsInt()
  userId: number;

  @IsInt()
  workTypeId: number;

  @IsInt()
  cinemaId: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  note?: string;
}