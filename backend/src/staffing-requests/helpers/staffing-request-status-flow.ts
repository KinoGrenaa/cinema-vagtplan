import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  canManageStaffing,
  staffingRequestInclude,
} from './staffing-request-helpers';
import { findStaffingRequestForUser } from './staffing-request-read-flow';

type StaffingRequestActionParams = {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  user: AuthUser;
  id: number;
  selectedCinemaId?: number | null;
};

export async function acceptStaffingRequest({
  prisma,
  realtimeGateway,
  user,
  id,
  selectedCinemaId,
}: StaffingRequestActionParams) {
  const request = await findStaffingRequestForUser(
    prisma,
    user,
    id,
    selectedCinemaId,
  );

  if (request.status !== StaffingRequestStatus.PENDING) {
    throw new BadRequestException(
      'Bemandingsforespørgslen er ikke længere åben',
    );
  }

  if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
    throw new ForbiddenException(
      'Kun medarbejdere og administratorer kan acceptere bemandingsforespørgsler',
    );
  }

  if (request.targetUserId && request.targetUserId !== user.sub) {
    throw new ForbiddenException('Du kan ikke acceptere denne forespørgsel');
  }

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

  if (requestShift?.userId && requestShift.userId !== user.sub) {
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
      userId: user.sub,
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

  if (updated.shiftId && updated.shift && !updated.shift.userId) {
    const assignedShift = await prisma.shift.update({
      where: {
        id: updated.shiftId,
      },
      data: {
        userId: user.sub,
      },
      include: {
        user: true,
        workType: true,
      },
    });

    realtimeGateway.notifyCinema(
      updated.cinemaId,
      'shiftsUpdated',
      assignedShift,
    );

    await createStaffingRequestAcceptedNotifications(
      prisma,
      updated.cinemaId,
      updated.id,
      user.email,
    );
  }

  if (updated.shiftId) {
    await prisma.staffingRequest.updateMany({
      where: {
        cinemaId: updated.cinemaId,
        id: {
          not: updated.id,
        },
        shiftId: updated.shiftId,
        status: StaffingRequestStatus.PENDING,
      },
      data: {
        status: StaffingRequestStatus.CANCELLED,
      },
    });
  }

  emitStaffingRequestsUpdate(realtimeGateway, updated.cinemaId);

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
  const request = await findStaffingRequestForUser(
    prisma,
    user,
    id,
    selectedCinemaId,
  );

  if (request.status !== StaffingRequestStatus.PENDING) {
    throw new BadRequestException(
      'Bemandingsforespørgslen er ikke længere åben',
    );
  }

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
  if (!canManageStaffing(user)) {
    throw new ForbiddenException(
      'Du må ikke annullere bemandingsforespørgsler',
    );
  }

  const request = await findStaffingRequestForUser(
    prisma,
    user,
    id,
    selectedCinemaId,
  );

  if (request.status !== StaffingRequestStatus.PENDING) {
    throw new BadRequestException('Kun åbne forespørgsler kan annulleres');
  }

  const updated = await prisma.staffingRequest.update({
    where: {
      id,
    },
    data: {
      status: StaffingRequestStatus.CANCELLED,
    },
    include: staffingRequestInclude,
  });

  emitStaffingRequestsUpdate(realtimeGateway, updated.cinemaId);

  return updated;
}

function emitStaffingRequestsUpdate(
  realtimeGateway: RealtimeGateway,
  cinemaId: number,
) {
  realtimeGateway.server.to(`cinema-${cinemaId}`).emit('staffingRequestsUpdated', {
    cinemaId,
  });
}

async function createStaffingRequestAcceptedNotifications(
  prisma: PrismaService,
  cinemaId: number,
  requestId: number,
  acceptedByEmail: string,
) {
  const admins = await prisma.user.findMany({
    where: {
      cinemaId,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      cinemaId,
      userId: admin.id,
      title: 'Bemandingsforespørgsel accepteret',
      message: `${acceptedByEmail} accepterede bemandingsforespørgsel #${requestId}`,
      type: 'STAFFING_ACCEPTED',
      linkUrl: '/staffing-requests',
    })),
  });
}
