import { IsEnum } from 'class-validator';

export class UpdateLeaveStatusDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}