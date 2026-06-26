import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';

import { AuthUser, canManageStaffing } from './staffing-request-helpers';

type StaffingRequestStatusCandidate = {
  status: StaffingRequestStatus;
  targetUserId: number | null;
};

export function assertPendingStaffingRequest(
  request: { status: StaffingRequestStatus },
  message = 'Bemandingsforespørgslen er ikke længere åben',
) {
  if (request.status !== StaffingRequestStatus.PENDING) {
    throw new BadRequestException(message);
  }
}

export function assertCanAcceptStaffingRequest(
  user: AuthUser,
  request: Pick<StaffingRequestStatusCandidate, 'targetUserId'>,
) {
  if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
    throw new ForbiddenException(
      'Kun medarbejdere og administratorer kan acceptere bemandingsforespørgsler',
    );
  }

  if (request.targetUserId && request.targetUserId !== user.sub) {
    throw new ForbiddenException('Du kan ikke acceptere denne forespørgsel');
  }
}

export function assertCanRejectStaffingRequest(
  user: AuthUser,
  request: Pick<StaffingRequestStatusCandidate, 'targetUserId'>,
) {
  if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
    throw new ForbiddenException(
      'Kun medarbejdere og administratorer kan afvise bemandingsforespørgsler',
    );
  }

  if (!request.targetUserId) {
    throw new ForbiddenException(
      'En forespørgsel til alle medarbejdere kan ikke afvises individuelt.',
    );
  }

  if (request.targetUserId !== user.sub) {
    throw new ForbiddenException('Du kan ikke afvise denne forespørgsel');
  }
}

export function assertCanCancelStaffingRequest(user: AuthUser) {
  if (!canManageStaffing(user)) {
    throw new ForbiddenException(
      'Du må ikke annullere bemandingsforespørgsler',
    );
  }
}
