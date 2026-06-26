import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { createStaffingRequestAcceptedNotifications } from './staffing-request-accepted-notifications';

type StaffingRequestAcceptCandidate = {
  cinemaId: number;
  shiftId: number | null;
  requestStartTime: Date | null;
  requestEndTime: Date | null;
};

type AcceptedStaffingRequest = {
  id: number;
  cinemaId: number;
  shiftId: number | null;
  shift?: {
    userId: number | null;
  } | null;
};

export async function assertNoStaffingRequestAcceptConflicts(
  prisma: PrismaService,
  request: StaffingRequestAcceptCandidate,
  userId: number,
) {
  const requestShift = request.shiftId
    ? await prisma.shift.findFirst({
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
      })
    : null;

  if (request.shiftId && !requestShift) {
    throw new NotFoundException('Vagt blev ikke fundet');
  }

  if (requestShift?.userId && requestShift.userId !== userId) {
    throw new BadRequestException(
      'Vagten er allerede tildelt en anden medarbejder.',
    );
  }

  const startTime = requestShift?.startTime ?? request.requestStartTime;
  const endTime = requestShift?.endTime ?? request.requestEndTime;

  if (!startTime || !endTime) {
    throw new BadRequestException(
      'Bemandingsforespørgslen mangler et gyldigt tidsinterval.',
    );
  }

  const overlappingShift = await prisma.shift.findFirst({
    where: {
      cinemaId: request.cinemaId,
      userId,
      id: requestShift
        ? {
            not: requestShift.id,
          }
        : undefined,
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
    select: {
      id: true,
    },
  });

  if (overlappingShift) {
    throw new BadRequestException('Du har allerede en vagt i det tidsrum.');
  }
}

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
