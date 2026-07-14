import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  getActorUserId,
} from './user-service-helpers';

async function findMembershipTarget(
  prisma: PrismaService,
  userId: number,
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      cinemaId: true,
      defaultCinemaId: true,
      isActive: true,
      cinemaMemberships: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          cinemaId: true,
          createdAt: true,
          cinema: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('Bruger blev ikke fundet');
  }

  return user;
}

function formatManagedMemberships(
  user: Awaited<ReturnType<typeof findMembershipTarget>>,
) {
  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      cinemaId: user.cinemaId,
      defaultCinemaId: user.defaultCinemaId,
      isActive: user.isActive,
    },
    memberships: user.cinemaMemberships
      .map((membership) => ({
        id: membership.id,
        cinemaId: membership.cinemaId,
        isPrimary:
          membership.cinemaId === user.cinemaId,
        createdAt: membership.createdAt,
        cinema: membership.cinema,
      }))
      .sort((first, second) => {
        if (first.isPrimary !== second.isPrimary) {
          return first.isPrimary ? -1 : 1;
        }

        return first.cinema.name.localeCompare(
          second.cinema.name,
          'da',
        );
      }),
  };
}

export async function findManagedUserCinemaMemberships(
  prisma: PrismaService,
  userId: number,
) {
  const user = await findMembershipTarget(prisma, userId);

  return formatManagedMemberships(user);
}

export async function updateManagedUserCinemaMemberships(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  userId: number,
  cinemaIds: number[],
  currentUser: AuthUser,
) {
  const user = await findMembershipTarget(prisma, userId);

  if (user.role === 'MASTER') {
    throw new BadRequestException(
      'MASTER-brugere bruger MASTER-panelets biografvalg',
    );
  }

  if (!user.cinemaId) {
    throw new BadRequestException(
      'Brugeren mangler en hjemmebiograf',
    );
  }

  const normalizedCinemaIds = Array.from(
    new Set(cinemaIds),
  ).sort((first, second) => first - second);

  if (!normalizedCinemaIds.includes(user.cinemaId)) {
    throw new BadRequestException(
      'Brugerens hjemmebiograf skal forblive et aktivt medlemskab',
    );
  }

  const cinemas = await prisma.cinema.findMany({
    where: {
      id: {
        in: normalizedCinemaIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (cinemas.length !== normalizedCinemaIds.length) {
    throw new BadRequestException(
      'En eller flere valgte biografer findes ikke',
    );
  }

  const shouldResetDefaultCinema =
    user.defaultCinemaId !== null &&
    !normalizedCinemaIds.includes(user.defaultCinemaId);

  await prisma.$transaction(async (transaction) => {
    await transaction.userCinemaMembership.updateMany({
      where: {
        userId,
        cinemaId: {
          notIn: normalizedCinemaIds,
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    for (const cinemaId of normalizedCinemaIds) {
      await transaction.userCinemaMembership.upsert({
        where: {
          userId_cinemaId: {
            userId,
            cinemaId,
          },
        },
        create: {
          userId,
          cinemaId,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });
    }

    if (shouldResetDefaultCinema) {
      await transaction.user.update({
        where: {
          id: userId,
        },
        data: {
          defaultCinemaId: user.cinemaId,
        },
      });
    }
  });

  await auditLogsService.create({
    action: 'UPDATE_USER_CINEMA_MEMBERSHIPS',
    entityType: 'User',
    entityId: user.id,
    description: `Opdaterede biograftilknytninger for ${user.firstName} ${user.lastName}: ${cinemas
      .map((cinema) => cinema.name)
      .sort((first, second) =>
        first.localeCompare(second, 'da'),
      )
      .join(', ')}${
      shouldResetDefaultCinema
        ? '. Standardbiograf blev nulstillet til hjemmebiografen.'
        : ''
    }`,
    userId: getActorUserId(currentUser),
    cinemaId: user.cinemaId,
  });

  return findManagedUserCinemaMemberships(
    prisma,
    userId,
  );
}
