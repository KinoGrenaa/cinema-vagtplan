import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

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
