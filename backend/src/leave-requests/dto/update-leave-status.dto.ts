import { IsEnum } from 'class-validator';

export class UpdateLeaveStatusDto {
  @IsEnum(['APPROVED', 'REJECTED', 'CANCELLED'])
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
}
