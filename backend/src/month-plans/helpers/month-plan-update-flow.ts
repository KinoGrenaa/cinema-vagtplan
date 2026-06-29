import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ensureScheduleTemplateForMonthPlan,
  monthPlanDayInclude,
  normalizeMonthPlanDate,
  parseOptionalBoolean,
  parseOptionalCount,
  parseOptionalDateTime,
  parseOptionalPositiveId,
  parseOptionalText,
  resolveMonthPlanCinemaId,
} from './month-plan-service-helpers';

export async function upsertMonthPlanDay(
  prisma: PrismaService,
  user,
  dateValue: string,
  body,
  cinemaIdValue?: string,
) {
  const cinemaId = resolveMonthPlanCinemaId(user, body?.cinemaId ?? cinemaIdValue);
  const date = normalizeMonthPlanDate(dateValue);

  const isActive = parseOptionalBoolean(body?.isActive, 'Aktiv dag');
  const scheduleTemplateId = parseOptionalPositiveId(body?.scheduleTemplateId, 'Vagtsskabelon');
  const note = parseOptionalText(body?.note, 'Note');
  const movieProgramFirstStart = parseOptionalDateTime(
    body?.movieProgramFirstStart,
    'Filmprogram start',
  );
  const movieProgramLastEnd = parseOptionalDateTime(
    body?.movieProgramLastEnd,
    'Filmprogram slut',
  );
  const movieShowingCount = parseOptionalCount(body?.movieShowingCount, 'Antal forestillinger');
  const plannedShiftCount = parseOptionalCount(body?.plannedShiftCount, 'Antal vagter');
  const unassignedShiftCount = parseOptionalCount(body?.unassignedShiftCount, 'Ubesatte vagter');

  if (
    movieProgramFirstStart &&
    movieProgramLastEnd &&
    movieProgramLastEnd <= movieProgramFirstStart
  ) {
    throw new BadRequestException('Filmprogram slut skal være efter filmprogram start.');
  }

  await ensureScheduleTemplateForMonthPlan(prisma, cinemaId, scheduleTemplateId);

  const data: Prisma.MonthPlanDayUncheckedUpdateInput & Prisma.MonthPlanDayUncheckedCreateInput = {
    cinemaId,
    date,
  };

  if (isActive !== undefined) {
    data.isActive = isActive;
  }

  if (scheduleTemplateId !== undefined) {
    data.scheduleTemplateId = scheduleTemplateId;
  }

  if (note !== undefined) {
    data.note = note;
  }

  if (movieProgramFirstStart !== undefined) {
    data.movieProgramFirstStart = movieProgramFirstStart;
  }

  if (movieProgramLastEnd !== undefined) {
    data.movieProgramLastEnd = movieProgramLastEnd;
  }

  if (movieShowingCount !== undefined) {
    data.movieShowingCount = movieShowingCount;
  }

  if (plannedShiftCount !== undefined) {
    data.plannedShiftCount = plannedShiftCount;
  }

  if (unassignedShiftCount !== undefined) {
    data.unassignedShiftCount = unassignedShiftCount;
  }

  return prisma.monthPlanDay.upsert({
    where: {
      cinemaId_date: {
        cinemaId,
        date,
      },
    },
    create: data,
    update: data,
    include: monthPlanDayInclude,
  });
}
