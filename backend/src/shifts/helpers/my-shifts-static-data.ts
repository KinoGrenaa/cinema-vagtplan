import {
  NotFoundException,
} from '@nestjs/common';

import type {
  PrismaService,
} from '../../prisma/prisma.service';

export const myShiftsColleagueSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profileImage: true,
  userJobFunctions: {
    select: {
      cinemaId: true,
      jobFunctionId: true,
    },
  },
} as const;

export const myShiftsCinemaSettingsSelect = {
  allowShiftTradePool: true,
  allowShiftTradeDirect: true,
} as const;

export async function findMyShiftsStaticData(
  prisma: PrismaService,
  params: {
    userId: number;
    cinemaId: number;
  },
) {
  const [
    memberships,
    cinemaSettings,
  ] = await Promise.all([
    prisma.userCinemaMembership.findMany({
      where: {
        cinemaId:
          params.cinemaId,
        isActive: true,
        userId: {
          not:
            params.userId,
        },
        user: {
          role: {
            not: 'MASTER',
          },
          isActive: true,
        },
      },
      select: {
        user: {
          select:
            myShiftsColleagueSelect,
        },
      },
      orderBy: [
        {
          user: {
            firstName: 'asc',
          },
        },
        {
          user: {
            lastName: 'asc',
          },
        },
        {
          userId: 'asc',
        },
      ],
    }),
    prisma.cinema.findUnique({
      where: {
        id: params.cinemaId,
      },
      select:
        myShiftsCinemaSettingsSelect,
    }),
  ]);

  if (!cinemaSettings) {
    throw new NotFoundException(
      'Biograf blev ikke fundet',
    );
  }

  return {
    users:
      memberships.map((membership) => ({
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        profileImage: membership.user.profileImage,
        jobFunctionIds: membership.user.userJobFunctions
          .filter((qualification) => qualification.cinemaId === params.cinemaId)
          .map((qualification) => qualification.jobFunctionId),
      })),
    cinemaSettings,
  };
}
