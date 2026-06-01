import { IsOptional, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
