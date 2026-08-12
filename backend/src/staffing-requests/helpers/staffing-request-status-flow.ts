import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  acquireShiftAdvisoryLock,
  SHIFT_RECORD_LOCK_NAMESPACE,
} from '../../shifts/helpers/shift-advisory-lock';
import {
  AuthUser,
  staffingRequestInclude,
} from './staffing-request-helpers';
import { assertNoStaffingRequestAcceptConflicts } from './staffing-request-acceptance-conflicts';
import { createStaffingRequestAcceptedNotifications } from './staffing-request-accepted-notifications';
import { resolveStaffingRequestNotifications } from './staffing-request-notification-resolution';
import {
  ensureStaffingRequestActorAccess,
  ensureStaffingRequestUserQualified,
} from './staffing-request-create-lookups';
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
}: Omit<StaffingRequestActionParams, 'realtimeGateway'>) {
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
  const accessibleRequest = await findAccessibleStaffingRequest({
    prisma,
    user,
    id,
    selectedCinemaId,
  });

  assertPendingStaffingRequest(accessibleRequest);
  assertCanAcceptStaffingRequest(user, accessibleRequest);

  const linkedShiftId = accessibleRequest.shiftId;

  if (!linkedShiftId) {
    throw new BadRequestException(
      'Bemandingsforespørgslen er ikke længere aktuel, fordi vagten er slettet',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await acquireShiftAdvisoryLock(
      tx,
      SHIFT_RECORD_LOCK_NAMESPACE,
      linkedShiftId,
    );

    const request = await tx.staffingRequest.findFirst({
      where: {
        id,
        cinemaId: accessibleRequest.cinemaId,
        status: StaffingRequestStatus.PENDING,
      },
      include: staffingRequestInclude,
    });

    if (!request) {
      throw new BadRequestException(
        'Bemandingsforespørgslen er ikke længere aktuel',
      );
    }

    assertCanAcceptStaffingRequest(user, request);

    if (!request.shiftId) {
      throw new BadRequestException(
        'Bemandingsforespørgslen er ikke længere aktuel, fordi vagten er slettet',
      );
    }

    await ensureStaffingRequestUserQualified({
      prisma: tx,
      cinemaId: request.cinemaId,
      userId: user.sub,
      jobFunctionId: request.jobFunctionId,
    });

    let currentShift:
      | {
          id: number;
          userId: number | null;
          startTime: Date;
          endTime: Date;
        }
      | null = null;

    if (request.shiftId) {
      currentShift = await tx.shift.findFirst({
        where: {
          id: request.shiftId,
          cinemaId: request.cinemaId,
        },
        select: {
          id: true,
          userId: true,
          startTime: true,
          endTime: true,
        },
      });

      if (!currentShift) {
        throw new BadRequestException(
          'Bemandingsforespørgslen er ikke længere aktuel, fordi vagten er slettet',
        );
      }

      if (currentShift.userId !== null) {
        throw new BadRequestException(
          'Bemandingsforespørgslen er ikke længere aktuel, fordi vagten allerede er tildelt',
        );
      }
    }

    await assertNoStaffingRequestAcceptConflicts(
      tx,
      request,
      user.sub,
    );

    const transition = await tx.staffingRequest.updateMany({
      where: {
        id,
        cinemaId: request.cinemaId,
        status: StaffingRequestStatus.PENDING,
      },
      data: {
        status: StaffingRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    if (transition.count !== 1) {
      throw new BadRequestException(
        'Bemandingsforespørgslen er ikke længere aktuel',
      );
    }

    let assignedShift: unknown = null;
    const relatedRequestIds = [id];

    if (request.shiftId) {
      const assignment = await tx.shift.updateMany({
        where: {
          id: request.shiftId,
          cinemaId: request.cinemaId,
          userId: null,
        },
        data: {
          userId: user.sub,
        },
      });

      if (assignment.count !== 1) {
        throw new BadRequestException(
          'Bemandingsforespørgslen er ikke længere aktuel, fordi vagten er blevet ændret',
        );
      }

      assignedShift = await tx.shift.findUnique({
        where: {
          id: request.shiftId,
        },
        include: {
          user: true,
          jobFunction: true,
        },
      });

      const otherPendingRequests =
        await tx.staffingRequest.findMany({
          where: {
            cinemaId: request.cinemaId,
            id: {
              not: id,
            },
            shiftId: request.shiftId,
            status: StaffingRequestStatus.PENDING,
          },
          select: {
            id: true,
          },
        });

      relatedRequestIds.push(
        ...otherPendingRequests.map(
          (pendingRequest) => pendingRequest.id,
        ),
      );

      await tx.staffingRequest.updateMany({
        where: {
          cinemaId: request.cinemaId,
          id: {
            not: id,
          },
          shiftId: request.shiftId,
          status: StaffingRequestStatus.PENDING,
        },
        data: {
          status: StaffingRequestStatus.CANCELLED,
        },
      });
    }

    const notificationUserIds =
      await resolveStaffingRequestNotifications(
        tx,
        request.cinemaId,
        relatedRequestIds,
      );

    if (assignedShift) {
      await createStaffingRequestAcceptedNotifications(
        tx,
        request.cinemaId,
        id,
        user.email,
      );
    }

    const updatedRequest = await tx.staffingRequest.findUnique({
      where: {
        id,
      },
      include: staffingRequestInclude,
    });

    if (!updatedRequest) {
      throw new NotFoundException(
        'Bemandingsforespørgsel blev ikke fundet',
      );
    }

    return {
      updatedRequest,
      assignedShift,
      notificationUserIds,
    };
  });

  if (result.assignedShift) {
    realtimeGateway.notifyCinema(
      accessibleRequest.cinemaId,
      'shiftsUpdated',
      result.assignedShift,
    );
  }

  for (const notificationUserId of result.notificationUserIds) {
    realtimeGateway.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId: accessibleRequest.cinemaId,
        staffingRequestId: id,
        resolved: true,
      },
    );
  }

  emitStaffingRequestsUpdate(
    realtimeGateway,
    accessibleRequest.cinemaId,
  );
  return result.updatedRequest;
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

  const result = await prisma.$transaction(async (tx) => {
    const transition = await tx.staffingRequest.updateMany({
      where: {
        id,
        cinemaId: request.cinemaId,
        status: StaffingRequestStatus.PENDING,
      },
      data: {
        status: StaffingRequestStatus.REJECTED,
        rejectedAt: new Date(),
      },
    });

    if (transition.count !== 1) {
      throw new BadRequestException(
        'Bemandingsforespørgslen er ikke længere åben',
      );
    }

    const notificationUserIds =
      await resolveStaffingRequestNotifications(
        tx,
        request.cinemaId,
        [id],
      );
    const updated = await tx.staffingRequest.findUnique({
      where: { id },
      include: staffingRequestInclude,
    });

    if (!updated) {
      throw new NotFoundException('Bemandingsforespørgsel blev ikke fundet');
    }

    return {
      updated,
      notificationUserIds,
    };
  });

  for (const notificationUserId of result.notificationUserIds) {
    realtimeGateway.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId: request.cinemaId,
        staffingRequestId: id,
        resolved: true,
      },
    );
  }
  emitStaffingRequestsUpdate(realtimeGateway, result.updated.cinemaId);
  return result.updated;
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

  const result = await prisma.$transaction(async (tx) => {
    const transition = await tx.staffingRequest.updateMany({
      where: {
        id,
        cinemaId: request.cinemaId,
        status: StaffingRequestStatus.PENDING,
      },
      data: {
        status: StaffingRequestStatus.CANCELLED,
      },
    });

    if (transition.count !== 1) {
      throw new BadRequestException(
        'Kun åbne forespørgsler kan annulleres',
      );
    }

    const notificationUserIds =
      await resolveStaffingRequestNotifications(
        tx,
        request.cinemaId,
        [id],
      );
    const updated = await tx.staffingRequest.findUnique({
      where: { id },
      include: staffingRequestInclude,
    });

    if (!updated) {
      throw new NotFoundException('Bemandingsforespørgsel blev ikke fundet');
    }

    return {
      updated,
      notificationUserIds,
    };
  });

  for (const notificationUserId of result.notificationUserIds) {
    realtimeGateway.notifyUser(
      notificationUserId,
      'notificationsUpdated',
      {
        cinemaId: request.cinemaId,
        staffingRequestId: id,
        resolved: true,
      },
    );
  }
  emitStaffingRequestsUpdate(realtimeGateway, result.updated.cinemaId);
  return result.updated;
}
