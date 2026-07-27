import type {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getCopenhagenDayRange,
} from './shift-service-helpers';

export const scheduleShiftSelect = {
  id: true,
  startTime: true,
  endTime: true,
  note: true,
  userId: true,
  workTypeId: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImage: true,
    },
  },
  workType: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
} as const;

export async function findScheduleShiftsForDay(
  prisma: PrismaService,
  cinemaId: number,
  date: string,
) {
  const {
    start,
    end,
  } = getCopenhagenDayRange(
    date,
  );

  return prisma.shift.findMany({
    where: {
      cinemaId,
      AND: [
        {
          startTime: {
            lt: end,
          },
        },
        {
          endTime: {
            gt: start,
          },
        },
      ],
    },
    select:
      scheduleShiftSelect,
    orderBy: [
      {
        startTime: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  });
}
