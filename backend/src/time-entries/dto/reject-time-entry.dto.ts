import {
  IsOptional,
  IsString,
} from 'class-validator';

export class RejectTimeEntryDto {
  @IsOptional()
  @IsString()
  adminNote?: string;
}