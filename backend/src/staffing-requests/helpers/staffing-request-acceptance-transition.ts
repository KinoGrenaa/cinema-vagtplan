import {
  StaffingRequestStatus,
} from '@prisma/client';

export function buildStaffingRequestAcceptedData(
  userId: number,
  acceptedAt = new Date(),
) {
  return {
    status:
      StaffingRequestStatus.ACCEPTED,
    acceptedAt,
    acceptedByUserId:
      userId,
  } as const;
}
