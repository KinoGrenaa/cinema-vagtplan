import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  CINEMA_START_ATTENTION_MODULE_KEYS,
  findAuthCinemaStartAttention,
} from './auth-cinema-start-attention';

const cinemaStartOverviewMembershipSelect = {
  cinemaId: true,
  role: true,
  canManageSchedule: true,
  canManageUsers: true,
  canManagePayroll: true,
  canManageLeaveRequests: true,
  canManageCinemaSettings: true,
  canSendBroadcastMessages: true,
  cinema: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      moduleSettings: {
        where: {
          moduleKey: {
            in: Array.from(
              CINEMA_START_ATTENTION_MODULE_KEYS,
            ),
          },
        },
        select: {
          moduleKey: true,
          enabled: true,
        },
      },
      shifts: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          workType: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  },
} as const;

export async function findAuthCinemaStartOverview(
  prisma: PrismaService,
  userId: number,
  now = new Date(),
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      defaultCinemaId: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'Brugeren blev ikke fundet',
    );
  }

  if (!user.isActive) {
    throw new UnauthorizedException(
      'Brugerkontoen er spærret',
    );
  }

  if (user.role === 'MASTER') {
    return {
      mode: 'MASTER' as const,
      activeCinemaCount: 0,
      defaultCinemaId:
        user.defaultCinemaId ?? null,
      cinemas: [],
    };
  }

  const memberships =
    await prisma.userCinemaMembership.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        ...cinemaStartOverviewMembershipSelect,
        cinema: {
          select: {
            ...cinemaStartOverviewMembershipSelect
              .cinema.select,
            shifts: {
              where: {
                userId,
                endTime: {
                  gt: now,
                },
              },
              select:
                cinemaStartOverviewMembershipSelect
                  .cinema.select.shifts.select,
              orderBy: [
                {
                  startTime: 'asc',
                },
                {
                  id: 'asc',
                },
              ],
              take: 1,
            },
          },
        },
      },
      orderBy: [
        {
          cinema: {
            name: 'asc',
          },
        },
        {
          cinemaId: 'asc',
        },
      ],
    });

  if (memberships.length === 0) {
    throw new ForbiddenException(
      'Din bruger har ingen aktiv biograftilknytning',
    );
  }

  const attentionByCinema =
    await findAuthCinemaStartAttention(
      prisma,
      userId,
      memberships,
    );

  const cinemas = memberships.map(
    (membership) => {
      const nextShift =
        membership.cinema.shifts[0] ?? null;

      return {
        cinemaId: membership.cinemaId,
        name: membership.cinema.name,
        logoUrl:
          membership.cinema.logoUrl ?? null,
        role: membership.role,
        isDefault:
          membership.cinemaId ===
          user.defaultCinemaId,
        permissions: {
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
        },
        attention:
          attentionByCinema.get(
            membership.cinemaId,
          ) ?? null,
        nextShift: nextShift
          ? {
              id: nextShift.id,
              startTime:
                nextShift.startTime,
              endTime:
                nextShift.endTime,
              workType: {
                id: nextShift.workType.id,
                name:
                  nextShift.workType.name,
                color:
                  nextShift.workType.color,
              },
            }
          : null,
      };
    },
  );

  const effectiveDefaultCinemaId =
    cinemas.find(
      (cinema) => cinema.isDefault,
    )?.cinemaId ?? null;

  return {
    mode:
      cinemas.length === 1
        ? ('SINGLE_CINEMA' as const)
        : ('MULTI_CINEMA' as const),
    activeCinemaCount: cinemas.length,
    defaultCinemaId:
      effectiveDefaultCinemaId,
    cinemas,
  };
}
