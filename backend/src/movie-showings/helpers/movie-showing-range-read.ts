import {
  BadRequestException,
} from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';
import {
  getCopenhagenDayRange,
} from './movie-showing-date-range';

const MAX_MOVIE_SHOWING_RANGE_DAYS = 30;
const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

export function getMovieShowingRange(
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

  if (
    days >
    MAX_MOVIE_SHOWING_RANGE_DAYS
  ) {
    throw new BadRequestException(
      'Datoperioden må højst være 30 dage',
    );
  }

  return {
    start: startDay.start,
    endExclusive:
      endDay.endExclusive,
    days,
  };
}

export async function findMovieShowingsForRange(
  prisma: PrismaService,
  cinemaId: number,
  startDate: string,
  endDate: string,
) {
  const {
    start,
    endExclusive,
  } = getMovieShowingRange(
    startDate,
    endDate,
  );

  return prisma.movieShowing.findMany({
    where: {
      cinemaId,
      startTime: {
        gte: start,
        lt: endExclusive,
      },
    },
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
