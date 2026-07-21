import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { parseRequiredPositiveInteger } from '../../common/query-validation';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  getActorUserId,
} from './user-service-helpers';
import {
  UserWriteDbClient,
  withUserWriteLock,
} from './user-write-lock';

type UserMembershipReadClient = Pick<
  Prisma.TransactionClient,
  'user'
>;

async function findMembershipTarget(
  prisma: UserMembershipReadClient,
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
    throw new NotFoundException(
      'Bruger blev ikke fundet',
    );
  }

  return user;
}

function formatManagedMemberships(
  user: Awaited<
    ReturnType<
      typeof findMembershipTarget
    >
  >,
) {
  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      cinemaId: user.cinemaId,
      defaultCinemaId:
        user.defaultCinemaId,
      isActive: user.isActive,
    },
    memberships: user.cinemaMemberships
      .map((membership) => ({
        id: membership.id,
        cinemaId: membership.cinemaId,
        isPrimary:
          membership.cinemaId ===
          user.cinemaId,
        createdAt: membership.createdAt,
        cinema: membership.cinema,
      }))
      .sort((first, second) => {
        if (
          first.isPrimary !==
          second.isPrimary
        ) {
          return first.isPrimary
            ? -1
            : 1;
        }

        return first.cinema.name.localeCompare(
          second.cinema.name,
          'da',
        );
      }),
  };
}

function normalizeManagedCinemaIds(
  cinemaIds: unknown,
) {
  if (!Array.isArray(cinemaIds)) {
    throw new BadRequestException(
      'Biografmedlemskaber skal være en liste',
    );
  }

  return Array.from(
    new Set(
      cinemaIds.map((cinemaId) =>
        parseRequiredPositiveInteger(
          cinemaId,
          'Biograf skal være et gyldigt ID',
        ),
      ),
    ),
  ).sort(
    (first, second) =>
      first - second,
  );
}

async function applyManagedMemberships(
  transaction: UserWriteDbClient,
  userId: number,
  normalizedCinemaIds: number[],
) {
  const user =
    await findMembershipTarget(
      transaction,
      userId,
    );

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

  if (
    !normalizedCinemaIds.includes(
      user.cinemaId,
    )
  ) {
    throw new BadRequestException(
      'Brugerens hjemmebiograf skal forblive et aktivt medlemskab',
    );
  }

  const cinemas =
    await transaction.cinema.findMany({
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

  if (
    cinemas.length !==
    normalizedCinemaIds.length
  ) {
    throw new BadRequestException(
      'En eller flere valgte biografer findes ikke',
    );
  }

  const shouldResetDefaultCinema =
    user.defaultCinemaId !== null &&
    !normalizedCinemaIds.includes(
      user.defaultCinemaId,
    );

  await transaction.userCinemaMembership.updateMany(
    {
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
    },
  );

  for (const cinemaId of normalizedCinemaIds) {
    await transaction.userCinemaMembership.upsert(
      {
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
      },
    );
  }

  if (shouldResetDefaultCinema) {
    await transaction.user.update({
      where: {
        id: userId,
      },
      data: {
        defaultCinemaId:
          user.cinemaId,
      },
    });
  }

  const updatedUser =
    await findMembershipTarget(
      transaction,
      userId,
    );

  return {
    formatted:
      formatManagedMemberships(
        updatedUser,
      ),
    user,
    cinemas,
    shouldResetDefaultCinema,
  };
}

export async function findManagedUserCinemaMemberships(
  prisma: PrismaService,
  userId: number,
) {
  const user =
    await findMembershipTarget(
      prisma,
      userId,
    );

  return formatManagedMemberships(user);
}

export async function updateManagedUserCinemaMemberships(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  userId: number,
  cinemaIds: number[],
  currentUser: AuthUser,
) {
  const normalizedCinemaIds =
    normalizeManagedCinemaIds(
      cinemaIds,
    );
  const result =
    await withUserWriteLock(
      prisma,
      userId,
      (
        transaction,
        lockedUserId,
      ) =>
        applyManagedMemberships(
          transaction,
          lockedUserId,
          normalizedCinemaIds,
        ),
    );

  await auditLogsService.create({
    action:
      'UPDATE_USER_CINEMA_MEMBERSHIPS',
    entityType: 'User',
    entityId: result.user.id,
    description:
      `Opdaterede biograftilknytninger for ${result.user.firstName} ${result.user.lastName}: ` +
      `${result.cinemas
        .map((cinema) => cinema.name)
        .sort((first, second) =>
          first.localeCompare(
            second,
            'da',
          ),
        )
        .join(', ')}` +
      `${
        result.shouldResetDefaultCinema
          ? '. Standardbiograf blev nulstillet til hjemmebiografen.'
          : ''
      }`,
    userId: getActorUserId(
      currentUser,
    ),
    cinemaId: result.user.cinemaId,
  });

  return result.formatted;
}
