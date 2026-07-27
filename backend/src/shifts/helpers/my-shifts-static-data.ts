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
    users,
    cinemaSettings,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: {
          not:
            params.userId,
        },
        role: {
          not: 'MASTER',
        },
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId:
              params.cinemaId,
            isActive: true,
          },
        },
      },
      select:
        myShiftsColleagueSelect,
      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          id: 'asc',
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
    users,
    cinemaSettings,
  };
}
