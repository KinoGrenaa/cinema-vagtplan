import {
  BadRequestException,
} from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';
import {
  scheduleShiftSelect,
} from './schedule-shift-read';
import {
  getCopenhagenDayRange,
} from './shift-service-helpers';

const MAX_SHIFT_RANGE_DAYS = 30;
const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

export function getScheduleShiftRange(
  startDate: string,
  endDate: string,
) {
  const startDay =
    getCopenhagenDayRange(startDate);
  const endDay =
    getCopenhagenDayRange(endDate);

  const startCalendar =
    Date.parse(
      `${startDate}T00:00:00.000Z`,
    );
  const endCalendar =
    Date.parse(
      `${endDate}T00:00:00.000Z`,
    );

  if (
    !Number.isFinite(startCalendar) ||
    !Number.isFinite(endCalendar) ||
    endCalendar < startCalendar
  ) {
    throw new BadRequestException(
      'Slutdato skal være samme dag eller efter startdato',
    );
  }

  const days =
    Math.floor(
      (endCalendar - startCalendar) /
        MILLISECONDS_PER_DAY,
    ) + 1;

  if (days > MAX_SHIFT_RANGE_DAYS) {
    throw new BadRequestException(
      'Datoperioden må højst være 30 dage',
    );
  }

  return {
    start: startDay.start,
    end: endDay.end,
    days,
  };
}

export async function findScheduleShiftsForRange(
  prisma: PrismaService,
  cinemaId: number,
  startDate: string,
  endDate: string,
) {
  const {
    start,
    end,
  } = getScheduleShiftRange(
    startDate,
    endDate,
  );

  return prisma.shift.findMany({
    where: {
      cinemaId,
      startTime: {
        gte: start,
        lt: end,
      },
    },
    select: scheduleShiftSelect,
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
