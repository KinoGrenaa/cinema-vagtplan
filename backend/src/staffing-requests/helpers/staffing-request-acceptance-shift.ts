import { StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { createStaffingRequestAcceptedNotifications } from './staffing-request-accepted-notifications';

export { assertNoStaffingRequestAcceptConflicts } from './staffing-request-acceptance-conflicts';

type AcceptedStaffingRequest = {
  id: number;
  cinemaId: number;
  shiftId: number | null;
  shift?: {
    userId: number | null;
  } | null;
};

export async function assignAcceptedStaffingRequestShift({
  prisma,
  realtimeGateway,
  request,
  userId,
  acceptedByEmail,
}: {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  request: AcceptedStaffingRequest;
  userId: number;
  acceptedByEmail: string;
}) {
  if (!request.shiftId || !request.shift || request.shift.userId) {
    return;
  }

  const assignedShift = await prisma.shift.update({
    where: {
      id: request.shiftId,
    },
    data: {
      userId,
    },
    include: {
      user: true,
      workType: true,
    },
  });

  realtimeGateway.notifyCinema(request.cinemaId, 'shiftsUpdated', assignedShift);

  await createStaffingRequestAcceptedNotifications(
    prisma,
    request.cinemaId,
    request.id,
    acceptedByEmail,
  );
}

export async function cancelOtherPendingStaffingRequestsForShift(
  prisma: PrismaService,
  request: Pick<AcceptedStaffingRequest, 'id' | 'cinemaId' | 'shiftId'>,
) {
  if (!request.shiftId) {
    return;
  }

  await prisma.staffingRequest.updateMany({
    where: {
      cinemaId: request.cinemaId,
      id: {
        not: request.id,
      },
      shiftId: request.shiftId,
      status: StaffingRequestStatus.PENDING,
    },
    data: {
      status: StaffingRequestStatus.CANCELLED,
    },
  });
}
