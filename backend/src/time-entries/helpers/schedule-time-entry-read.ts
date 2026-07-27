import {
  TimeEntryStatus,
} from '@prisma/client';

import type {
  PrismaService,
} from '../../prisma/prisma.service';
import {
  getCopenhagenDayRange,
} from '../../shifts/helpers/shift-service-helpers';

export const scheduleTimeEntrySelect = {
  id: true,
  shiftId: true,
  status: true,
  clockIn: true,
  clockOut: true,
} as const;

export function findScheduleTimeEntriesForDay(
  prisma: PrismaService,
  params: {
    userId: number;
    cinemaId: number;
    date: string;
  },
) {
  const {
    start,
    end,
  } = getCopenhagenDayRange(
    params.date,
  );

  return prisma.timeEntry.findMany({
    where: {
      userId:
        params.userId,
      cinemaId:
        params.cinemaId,
      status: {
        not:
          TimeEntryStatus.VOIDED,
      },
      shift: {
        is: {
          startTime: {
            lt: end,
          },
          endTime: {
            gt: start,
          },
        },
      },
    },
    select:
      scheduleTimeEntrySelect,
    orderBy: [
      {
        clockIn: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });
}
