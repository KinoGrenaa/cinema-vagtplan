import {
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTimeEntryDto {
  @IsString()
  clockIn: string;

  @IsOptional()
  @IsString()
  clockOut?: string | null;

  @IsString()
  adminNote: string;
}