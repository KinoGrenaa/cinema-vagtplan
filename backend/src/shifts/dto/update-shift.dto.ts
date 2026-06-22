import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsInt()
  userId?: number | null;

  @IsInt()
  workTypeId: number;

  @IsOptional()
  @IsInt()
  cinemaId?: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  note?: string | null;
}
