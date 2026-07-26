import {
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  AuthUser,
  canManageStaffing,
  resolveStaffingCinemaId,
  staffingRequestInclude,
} from './staffing-request-helpers';
import {
  findStaffingRequestPage,
  type StaffingRequestPageOptions,
} from './staffing-request-page';

export async function findAllStaffingRequests(
  prisma: PrismaService,
  user: AuthUser,
  selectedCinemaId?:
    number | null,
) {
  if (!canManageStaffing(user)) {
    return findMineStaffingRequests(
      prisma,
      user,
      selectedCinemaId,
    );
  }

  const cinemaId =
    resolveStaffingCinemaId(
      user,
      selectedCinemaId,
    );

  return prisma.staffingRequest.findMany({
    where: {
      cinemaId,
    },
    include:
      staffingRequestInclude,
    orderBy: [
      {
        status: 'asc',
      },
      {
        priority: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });
}

export async function findStaffingRequestsPage(
  prisma: PrismaService,
  user: AuthUser,
  selectedCinemaId:
    number | null | undefined,
  options:
    StaffingRequestPageOptions = {},
) {
  return findStaffingRequestPage(
    prisma,
    user,
    selectedCinemaId,
    options,
  );
}

export async function findMineStaffingRequests(
  prisma: PrismaService,
  user: AuthUser,
  selectedCinemaId?:
    number | null,
) {
  const cinemaId =
    resolveStaffingCinemaId(
      user,
      selectedCinemaId,
    );

  return prisma.staffingRequest.findMany({
    where: {
      cinemaId,
      OR: [
        {
          targetUserId:
            user.sub,
        },
        {
          requestedByUserId:
            user.sub,
        },
        {
          targetUserId:
            null,
        },
      ],
    },
    include:
      staffingRequestInclude,
    orderBy: [
      {
        status: 'asc',
      },
      {
        priority: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });
}

export async function findStaffingRequestForUser(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?:
    number | null,
) {
  const cinemaId =
    resolveStaffingCinemaId(
      user,
      selectedCinemaId,
    );

  const request =
    await prisma.staffingRequest.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

  if (!request) {
    throw new NotFoundException(
      'Bemandingsforespørgsel blev ikke fundet',
    );
  }

  return request;
}
