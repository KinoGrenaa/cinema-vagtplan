import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { getCopenhagenDayInstantRange } from '../../shift-planning-drafts/shift-planning-time-zone';
import type { AuthUser, CinemaContextValue } from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getRequiredJobFunctionCinemaId,
} from './job-function-service-helpers';
import { resolveJobFunctionTiming } from './job-function-timing-resolver';

function parseDateKey(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Dato skal være i formatet YYYY-MM-DD.');
  }
  getCopenhagenDayInstantRange(value);
  return value;
}

export async function previewJobFunctionTiming(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  data: { date?: unknown },
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  const date = parseDateKey(data?.date);
  const jobFunction = await findJobFunctionForCinema(
    prisma,
    jobFunctionId,
    cinemaId,
    true,
  );
  if (!jobFunction.timingRule?.isActive) {
    throw new BadRequestException('Jobfunktionen har ingen aktiv tidsregel.');
  }
  const day = getCopenhagenDayInstantRange(date);
  const nextTwoDays = new Date(day.end.getTime() + 2 * 24 * 60 * 60 * 1000);
  const movieShowings = await prisma.movieShowing.findMany({
    where: {
      cinemaId,
      startTime: { gte: day.start, lt: nextTwoDays },
    },
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    select: { id: true, title: true, startTime: true, endTime: true },
  });
  const logicalDate = new Date(`${date}T00:00:00.000Z`);
  const result = resolveJobFunctionTiming(
    logicalDate,
    jobFunction.timingRule,
    movieShowings,
  );

  return {
    date,
    jobFunction: {
      id: jobFunction.id,
      name: jobFunction.name,
      color: jobFunction.color,
    },
    usedFallback: result.usedFallback,
    startMinute: result.startMinute,
    endMinute: result.endMinute,
    sourceMovieShowingIds: result.sourceMovieShowingIds,
    sourceMovieShowings: movieShowings.filter((showing) =>
      result.sourceMovieShowingIds.includes(showing.id),
    ),
    explanation: result.explanation,
  };
}
