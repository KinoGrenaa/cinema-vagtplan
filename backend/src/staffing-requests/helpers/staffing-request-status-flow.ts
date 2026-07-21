import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  staffingRequestInclude,
} from './staffing-request-helpers';
import { assertNoStaffingRequestAcceptConflicts } from './staffing-request-acceptance-conflicts';
import { createStaffingRequestAcceptedNotifications } from './staffing-request-accepted-notifications';
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
  const request = await findAccessibleStaffingRequest({
    prisma,
    user,
    id,
    selectedCinemaId,
  });

  assertPendingStaffingRequest(request);
  assertCanAcceptStaffingRequest(user, request);
  await assertNoStaffingRequestAcceptConflicts(prisma, request, user.sub);

  const result = await prisma.$transaction(async (tx) => {
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
        'Bemandingsforespørgslen er ikke længere åben',
      );
    }

    let assignedShift: unknown = null;
    let assignedShiftNow = false;

    if (request.shiftId) {
      const currentShift = await tx.shift.findFirst({
        where: {
          id: request.shiftId,
          cinemaId: request.cinemaId,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!currentShift) {
        throw new NotFoundException('Vagt blev ikke fundet');
      }

      if (currentShift.userId && currentShift.userId !== user.sub) {
        throw new BadRequestException(
          'Vagten er allerede tildelt en anden medarbejder.',
        );
      }

      if (!currentShift.userId) {
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
            'Vagten er allerede blevet taget af en anden medarbejder.',
          );
        }

        assignedShiftNow = true;
        assignedShift = await tx.shift.findUnique({
          where: {
            id: request.shiftId,
          },
          include: {
            user: true,
            workType: true,
          },
        });
      }

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

    if (assignedShiftNow) {
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
    };
  });

  if (result.assignedShift) {
    realtimeGateway.notifyCinema(
      request.cinemaId,
      'shiftsUpdated',
      result.assignedShift,
    );
  }

  emitStaffingRequestsUpdate(realtimeGateway, request.cinemaId);
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

  const transition = await prisma.staffingRequest.updateMany({
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

  const updated = await prisma.staffingRequest.findUnique({
    where: { id },
    include: staffingRequestInclude,
  });

  if (!updated) {
    throw new NotFoundException('Bemandingsforespørgsel blev ikke fundet');
  }

  emitStaffingRequestsUpdate(realtimeGateway, updated.cinemaId);
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

  const transition = await prisma.staffingRequest.updateMany({
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

  const updated = await prisma.staffingRequest.findUnique({
    where: { id },
    include: staffingRequestInclude,
  });

  if (!updated) {
    throw new NotFoundException('Bemandingsforespørgsel blev ikke fundet');
  }

  emitStaffingRequestsUpdate(realtimeGateway, updated.cinemaId);
  return updated;
}
