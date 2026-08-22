import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateLeaveStatusDto {
  @IsEnum(['APPROVED', 'REJECTED', 'CANCELLED'])
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
