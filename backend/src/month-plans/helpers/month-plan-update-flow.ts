import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensureScheduleTemplateForMonthPlan,
  monthPlanDayInclude,
  normalizeMonthPlanDate,
  normalizeMonthPlanUpdateBody,
  parseOptionalBoolean,
  parseOptionalCount,
  parseOptionalDateTime,
  parseOptionalPositiveId,
  parseOptionalText,
  resolveMonthPlanCinemaId,
  withMonthPlanCinemaLock,
  type MonthPlanAuthUser,
  type MonthPlanCinemaValue,
} from './month-plan-service-helpers';

function applyMonthPlanFields(
  target:
    | Prisma.MonthPlanDayUncheckedCreateInput
    | Prisma.MonthPlanDayUncheckedUpdateInput,
  values: {
    isActive?: boolean;
    scheduleTemplateId?: number | null;
    note?: string | null;
    movieProgramFirstStart?: Date | null;
    movieProgramLastEnd?: Date | null;
    movieShowingCount?: number;
    plannedShiftCount?: number;
    unassignedShiftCount?: number;
  },
) {
  if (values.isActive !== undefined) {
    target.isActive = values.isActive;
  }
  if (
    values.scheduleTemplateId !== undefined
  ) {
    target.scheduleTemplateId =
      values.scheduleTemplateId;
  }
  if (values.note !== undefined) {
    target.note = values.note;
  }
  if (
    values.movieProgramFirstStart !==
    undefined
  ) {
    target.movieProgramFirstStart =
      values.movieProgramFirstStart;
  }
  if (
    values.movieProgramLastEnd !==
    undefined
  ) {
    target.movieProgramLastEnd =
      values.movieProgramLastEnd;
  }
  if (
    values.movieShowingCount !== undefined
  ) {
    target.movieShowingCount =
      values.movieShowingCount;
  }
  if (
    values.plannedShiftCount !== undefined
  ) {
    target.plannedShiftCount =
      values.plannedShiftCount;
  }
  if (
    values.unassignedShiftCount !==
    undefined
  ) {
    target.unassignedShiftCount =
      values.unassignedShiftCount;
  }
}

export async function upsertMonthPlanDay(
  prisma: PrismaService,
  user: MonthPlanAuthUser,
  dateValue: string,
  bodyValue: unknown,
  cinemaIdValue?: MonthPlanCinemaValue,
) {
  const body =
    normalizeMonthPlanUpdateBody(bodyValue);
  const cinemaId = resolveMonthPlanCinemaId(
    user,
    (body.cinemaId ??
      cinemaIdValue) as MonthPlanCinemaValue,
  );
  const date =
    normalizeMonthPlanDate(dateValue);
  const values = {
    isActive: parseOptionalBoolean(
      body.isActive,
      'Aktiv dag',
    ),
    scheduleTemplateId:
      parseOptionalPositiveId(
        body.scheduleTemplateId,
        'Vagtsskabelon',
      ),
    note: parseOptionalText(
      body.note,
      'Note',
    ),
    movieProgramFirstStart:
      parseOptionalDateTime(
        body.movieProgramFirstStart,
        'Filmprogram start',
      ),
    movieProgramLastEnd:
      parseOptionalDateTime(
        body.movieProgramLastEnd,
        'Filmprogram slut',
      ),
    movieShowingCount: parseOptionalCount(
      body.movieShowingCount,
      'Antal forestillinger',
    ),
    plannedShiftCount: parseOptionalCount(
      body.plannedShiftCount,
      'Antal vagter',
    ),
    unassignedShiftCount:
      parseOptionalCount(
        body.unassignedShiftCount,
        'Ubesatte vagter',
      ),
  };

  return withMonthPlanCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      await ensureScheduleTemplateForMonthPlan(
        transaction,
        cinemaId,
        values.scheduleTemplateId,
      );

      const existing =
        await transaction.monthPlanDay.findUnique(
          {
            where: {
              cinemaId_date: {
                cinemaId,
                date,
              },
            },
            select: {
              movieProgramFirstStart: true,
              movieProgramLastEnd: true,
            },
          },
        );

      const effectiveFirstStart =
        values.movieProgramFirstStart ===
        undefined
          ? existing?.movieProgramFirstStart ??
            null
          : values.movieProgramFirstStart;
      const effectiveLastEnd =
        values.movieProgramLastEnd ===
        undefined
          ? existing?.movieProgramLastEnd ??
            null
          : values.movieProgramLastEnd;

      if (
        effectiveFirstStart &&
        effectiveLastEnd &&
        effectiveLastEnd.getTime() <=
          effectiveFirstStart.getTime()
      ) {
        throw new BadRequestException(
          'Filmprogram slut skal være efter filmprogram start.',
        );
      }

      const createData: Prisma.MonthPlanDayUncheckedCreateInput =
        {
          cinemaId,
          date,
        };
      const updateData: Prisma.MonthPlanDayUncheckedUpdateInput =
        {};

      applyMonthPlanFields(
        createData,
        values,
      );
      applyMonthPlanFields(
        updateData,
        values,
      );

      return transaction.monthPlanDay.upsert({
        where: {
          cinemaId_date: {
            cinemaId,
            date,
          },
        },
        create: createData,
        update: updateData,
        include: monthPlanDayInclude,
      });
    },
  );
}
