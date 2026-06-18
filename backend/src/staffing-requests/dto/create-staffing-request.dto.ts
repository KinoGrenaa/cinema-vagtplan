import { StaffingRequestType } from '@prisma/client';

export class CreateStaffingRequestDto {
  shiftId?: number;
  targetUserId?: number;
  type: StaffingRequestType;
  priority?: number;
  message?: string;
  aiGenerated?: boolean;
  expiresAt?: string;
  cinemaId?: number | string | null;
}
