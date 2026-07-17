import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  Role,
  StaffingRequestStatus,
  StaffingRequestType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export function getActiveCinemaUserWhere(params: {
  cinemaId: number;
  role: Role;
  userId?: number;
}): Prisma.UserWhereInput {
  return {
    ...(params.userId ? { id: params.userId } : {}),
    role: params.role,
    isActive: true,
    OR: [
      {
        cinemaId: params.cinemaId,
      },
      {
        cinemaMemberships: {
          some: {
            cinemaId: params.cinemaId,
            isActive: true,
          },
        },
      },
    ],
  };
}

type StaffingRequestDecision = {
  status: StaffingRequestStatus;
  type: StaffingRequestType;
};

export function calculateCinemaRequestRates(
  requests: StaffingRequestDecision[],
) {
  const decidedRequests = requests.filter(
    (request) =>
      request.status === StaffingRequestStatus.ACCEPTED ||
      request.status === StaffingRequestStatus.REJECTED,
  );
  const acceptedRequests = decidedRequests.filter(
    (request) => request.status === StaffingRequestStatus.ACCEPTED,
  ).length;
  const rejectedRequests = decidedRequests.length - acceptedRequests;
  const emergencyRequests = decidedRequests.filter(
    (request) => request.type === StaffingRequestType.EMERGENCY,
  );
  const acceptedEmergencyRequests = emergencyRequests.filter(
    (request) => request.status === StaffingRequestStatus.ACCEPTED,
  ).length;

  return {
    totalRequests: decidedRequests.length,
    acceptedRequests,
    rejectedRequests,
    acceptanceRate:
      decidedRequests.length === 0
        ? 0
        : acceptedRequests / decidedRequests.length,
    rejectionRate:
      decidedRequests.length === 0
        ? 0
        : rejectedRequests / decidedRequests.length,
    emergencyAcceptanceRate:
      emergencyRequests.length === 0
        ? 0
        : acceptedEmergencyRequests / emergencyRequests.length,
  };
}

export async function findAiRequestActorForCinema(
  prisma: PrismaService,
  cinemaId: number,
) {
  const admin = await prisma.user.findFirst({
    where: getActiveCinemaUserWhere({
      cinemaId,
      role: Role.ADMIN,
    }),
    select: {
      id: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (admin) {
    return admin;
  }

  return prisma.user.findFirst({
    where: {
      role: Role.MASTER,
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      id: 'asc',
    },
  });
}

export async function ensureAiRequestActorAccess(params: {
  prisma: PrismaService;
  requestedByUserId: number;
  cinemaId: number;
}) {
  const user = await params.prisma.user.findUnique({
    where: {
      id: params.requestedByUserId,
    },
    select: {
      id: true,
      role: true,
      cinemaId: true,
      isActive: true,
      cinemaMemberships: {
        where: {
          cinemaId: params.cinemaId,
          isActive: true,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!user || !user.isActive) {
    throw new NotFoundException('Bruger blev ikke fundet');
  }

  if (user.role === Role.MASTER) {
    return;
  }

  const hasCinemaAccess =
    user.cinemaId === params.cinemaId || user.cinemaMemberships.length > 0;

  if (user.role !== Role.ADMIN || !hasCinemaAccess) {
    throw new ForbiddenException(
      'Brugeren må ikke oprette AI-bemandingsforespørgsler for denne biograf',
    );
  }
}
