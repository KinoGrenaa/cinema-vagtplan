import { StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  staffingRequestInclude,
} from './staffing-request-helpers';
import {
  assertNoStaffingRequestAcceptConflicts,
  assignAcceptedStaffingRequestShift,
  cancelOtherPendingStaffingRequestsForShift,
} from './staffing-request-acceptance-shift';
import { ensureStaffingRequestActorAccess } from './staffing-request-create-lookups';
import { emitStaffingRequestsUpdate } from './staffing-request-realtime';
import {
  assertCanAcceptStaffingRequest,
  assertCanCancelStaffingRequest,
  assertCanRejectStaffingRequest,
  assertPendingStaffingRequest,
} from './staffing-request-status-guards';
import { findStaffingRequestForUser } from './staffing-request-read-flow';

type StaffingRequestActionParams = {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  user: AuthUser;
  id: number;
  selectedCinemaId?: number | null;
};

async function findAccessibleStaffingRequest({
  prisma,
  user,
  id,
  selectedCinemaId,
}: Omit<
  StaffingRequestActionParams,
  'realtimeGateway'
>) {
  const request = await findStaffingRequestForUser(
    prisma,
    user,
    id,
    selectedCinemaId,
  );

  await ensureStaffingRequestActorAccess({
    prisma,
    user,
    cinemaId: request.cinemaId,
  });

  return request;
}

export async function acceptStaffingRequest({
  prisma,
  realtimeGateway,
  user,
  id,
  selectedCinemaId,
}: StaffingRequestActionParams) {
  const request = await findAccessibleStaffingRequest({
    prisma,
    user,
    id,
    selectedCinemaId,
  });

  assertPendingStaffingRequest(request);
  assertCanAcceptStaffingRequest(user, request);

  await assertNoStaffingRequestAcceptConflicts(
    prisma,
    request,
    user.sub,
  );

  const updated = await prisma.staffingRequest.update({
    where: {
      id,
    },
    data: {
      status: StaffingRequestStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
    include: staffingRequestInclude,
  });

  await assignAcceptedStaffingRequestShift({
    prisma,
    realtimeGateway,
    request: updated,
    userId: user.sub,
    acceptedByEmail: user.email,
  });

  await cancelOtherPendingStaffingRequestsForShift(
    prisma,
    updated,
  );

  emitStaffingRequestsUpdate(
    realtimeGateway,
    updated.cinemaId,
  );

  return prisma.staffingRequest.findUnique({
    where: {
      id: updated.id,
    },
    include: staffingRequestInclude,
  });
}

export async function rejectStaffingRequest({
  prisma,
  realtimeGateway,
  user,
  id,
  selectedCinemaId,
}: StaffingRequestActionParams) {
  const request = await findAccessibleStaffingRequest({
    prisma,
    user,
    id,
    selectedCinemaId,
  });

  assertPendingStaffingRequest(request);
  assertCanRejectStaffingRequest(user, request);

  const updated = await prisma.staffingRequest.update({
    where: {
      id,
    },
    data: {
      status: StaffingRequestStatus.REJECTED,
      rejectedAt: new Date(),
    },
    include: staffingRequestInclude,
  });

  emitStaffingRequestsUpdate(
    realtimeGateway,
    updated.cinemaId,
  );

  return updated;
}

export async function cancelStaffingRequest({
  prisma,
  realtimeGateway,
  user,
  id,
  selectedCinemaId,
}: StaffingRequestActionParams) {
  assertCanCancelStaffingRequest(user);

  const request = await findAccessibleStaffingRequest({
    prisma,
    user,
    id,
    selectedCinemaId,
  });

  assertPendingStaffingRequest(
    request,
    'Kun åbne forespørgsler kan annulleres',
  );

  const updated = await prisma.staffingRequest.update({
    where: {
      id,
    },
    data: {
      status: StaffingRequestStatus.CANCELLED,
    },
    include: staffingRequestInclude,
  });

  emitStaffingRequestsUpdate(
    realtimeGateway,
    updated.cinemaId,
  );

  return updated;
}
