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
          role: true,
          employmentType: true,
          canManageSchedule: true,
          canManageUsers: true,
          canManagePayroll: true,
          canManageLeaveRequests: true,
          canManageCinemaSettings: true,
          canSendBroadcastMessages: true,
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
    ReturnType<typeof findMembershipTarget>
  >,
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
        role: membership.role,
        employmentType:
          membership.employmentType,
        canManageSchedule:
          membership.canManageSchedule,
        canManageUsers:
          membership.canManageUsers,
        canManagePayroll:
          membership.canManagePayroll,
        canManageLeaveRequests:
          membership.canManageLeaveRequests,
        canManageCinemaSettings:
          membership.canManageCinemaSettings,
        canSendBroadcastMessages:
          membership.canSendBroadcastMessages,
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
  ).sort((first, second) => first - second);
}

function resolveNextAccountCinemaId(
  user: Awaited<
    ReturnType<typeof findMembershipTarget>
  >,
  normalizedCinemaIds: number[],
) {
  if (normalizedCinemaIds.length === 0) {
    return null;
  }

  if (
    user.cinemaId &&
    normalizedCinemaIds.includes(user.cinemaId)
  ) {
    return user.cinemaId;
  }

  if (
    user.defaultCinemaId &&
    normalizedCinemaIds.includes(
      user.defaultCinemaId,
    )
  ) {
    return user.defaultCinemaId;
  }

  return normalizedCinemaIds[0] ?? null;
}

async function applyManagedMemberships(
  transaction: UserWriteDbClient,
  userId: number,
  normalizedCinemaIds: number[],
) {
  const user = await findMembershipTarget(
    transaction,
    userId,
  );

  if (user.role === 'MASTER') {
    throw new BadRequestException(
      'MASTER-brugere bruger MASTER-panelets biografvalg',
    );
  }

  const cinemas = await transaction.cinema.findMany({
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

  const nextCinemaId = resolveNextAccountCinemaId(
    user,
    normalizedCinemaIds,
  );
  const nextDefaultCinemaId =
    user.defaultCinemaId !== null &&
    normalizedCinemaIds.includes(
      user.defaultCinemaId,
    )
      ? user.defaultCinemaId
      : nextCinemaId;
  const defaultCinemaChanged =
    user.defaultCinemaId !== nextDefaultCinemaId;

  await transaction.userCinemaMembership.updateMany({
    where: {
      userId,
      isActive: true,
      ...(normalizedCinemaIds.length > 0
        ? {
            cinemaId: {
              notIn: normalizedCinemaIds,
            },
          }
        : {}),
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

  await transaction.user.update({
    where: {
      id: userId,
    },
    data: {
      cinemaId: nextCinemaId,
      defaultCinemaId: nextDefaultCinemaId,
    },
  });

  const updatedUser = await findMembershipTarget(
    transaction,
    userId,
  );

  return {
    formatted: formatManagedMemberships(updatedUser),
    user,
    cinemas,
    defaultCinemaChanged,
    auditCinemaId: nextCinemaId ?? user.cinemaId,
  };
}

export async function findManagedUserCinemaMemberships(
  prisma: PrismaService,
  userId: number,
) {
  const user = await findMembershipTarget(
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
    normalizeManagedCinemaIds(cinemaIds);

  const result = await withUserWriteLock(
    prisma,
    userId,
    (transaction, lockedUserId) =>
      applyManagedMemberships(
        transaction,
        lockedUserId,
        normalizedCinemaIds,
      ),
  );

  const cinemaNames = result.cinemas
    .map((cinema) => cinema.name)
    .sort((first, second) =>
      first.localeCompare(second, 'da'),
    );

  await auditLogsService.create({
    action: 'UPDATE_USER_CINEMA_MEMBERSHIPS',
    entityType: 'User',
    entityId: result.user.id,
    description:
      `Opdaterede biograftilknytninger for ${result.user.firstName} ${result.user.lastName}: ` +
      `${
        cinemaNames.length > 0
          ? cinemaNames.join(', ')
          : 'ingen aktive biografer'
      }` +
      `${
        result.defaultCinemaChanged
          ? '. Standardbiograf blev opdateret automatisk.'
          : ''
      }`,
    userId: getActorUserId(currentUser),
    cinemaId: result.auditCinemaId,
  });

  return result.formatted;
}

export async function updateManagedUserDefaultCinema(
  prisma: PrismaService,
  auditLogsService: AuditLogsService,
  userId: number,
  cinemaIdValue: unknown,
  currentUser: AuthUser,
) {
  const cinemaId = parseRequiredPositiveInteger(
    cinemaIdValue,
    'Standardbiograf skal være et gyldigt ID',
  );

  const result = await withUserWriteLock(
    prisma,
    userId,
    async (transaction, lockedUserId) => {
      const user = await findMembershipTarget(
        transaction,
        lockedUserId,
      );

      if (user.role === 'MASTER') {
        throw new BadRequestException(
          'MASTER-brugere bruger MASTER-panelets biografvalg',
        );
      }

      const membership =
        await transaction.userCinemaMembership.findFirst({
          where: {
            userId: lockedUserId,
            cinemaId,
            isActive: true,
          },
          select: {
            id: true,
            cinema: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      if (!membership) {
        throw new BadRequestException(
          'Standardbiografen skal være en aktiv biograftilknytning',
        );
      }

      await transaction.user.update({
        where: {
          id: lockedUserId,
        },
        data: {
          defaultCinemaId: cinemaId,
        },
      });

      const updatedUser =
        await findMembershipTarget(
          transaction,
          lockedUserId,
        );

      return {
        formatted:
          formatManagedMemberships(updatedUser),
        user,
        cinema: membership.cinema,
      };
    },
  );

  await auditLogsService.create({
    action: 'UPDATE_USER_DEFAULT_CINEMA',
    entityType: 'User',
    entityId: result.user.id,
    description:
      `Ændrede standardbiograf for ${result.user.firstName} ${result.user.lastName} ` +
      `til ${result.cinema.name}.`,
    userId: getActorUserId(currentUser),
    cinemaId: result.cinema.id,
  });

  return result.formatted;
}
