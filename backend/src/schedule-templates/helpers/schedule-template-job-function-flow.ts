import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureActiveJobFunctionForCinema,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  findScheduleTemplateJobFunctionForCinema,
  getRequiredScheduleTemplateCinemaId,
  normalizeOptionalText,
  parseOptionalPositiveId,
  parseOptionalSortOrder,
  parseRequiredCount,
  parseRequiredPositiveId,
  parseWeekday,
  ScheduleTemplateJobFunctionData,
  scheduleTemplateJobFunctionInclude,
  withScheduleTemplateCinemaLock,
} from './schedule-template-service-helpers';

export async function addScheduleTemplateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  weekdayValue: number,
  data: ScheduleTemplateJobFunctionData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);

  const cinemaId =
    getRequiredScheduleTemplateCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const weekday = parseWeekday(weekdayValue);
  const jobFunctionId =
    parseRequiredPositiveId(
      data?.jobFunctionId,
      'Jobfunktion skal være et gyldigt ID.',
    );
  const requiredCount = parseRequiredCount(
    data?.requiredCount,
  );
  const sortOrder =
    parseOptionalSortOrder(data?.sortOrder) ?? 0;
  const note =
    normalizeOptionalText(data?.note) ?? null;

  return withScheduleTemplateCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const template =
        await findScheduleTemplateForCinema(
          transaction,
          templateId,
          cinemaId,
          true,
        );

      await ensureActiveJobFunctionForCinema(
        transaction,
        jobFunctionId,
        cinemaId,
      );

      const day =
        await transaction.scheduleTemplateDay.upsert(
          {
            where: {
              templateId_weekday: {
                templateId: template.id,
                weekday,
              },
            },
            create: {
              cinemaId,
              templateId: template.id,
              weekday,
              isActive: true,
              sortOrder: weekday,
            },
            update: {},
          },
        );

      return transaction.scheduleTemplateJobFunction.create(
        {
          data: {
            cinemaId,
            templateDayId: day.id,
            jobFunctionId,
            requiredCount,
            sortOrder,
            note,
          },
          include:
            scheduleTemplateJobFunctionInclude,
        },
      );
    },
  );
}

export async function updateScheduleTemplateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  data: ScheduleTemplateJobFunctionData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);

  const cinemaId =
    getRequiredScheduleTemplateCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const jobFunctionId =
    parseOptionalPositiveId(
      data?.jobFunctionId,
      'Jobfunktion skal være et gyldigt ID.',
    );
  const requiredCount = parseRequiredCount(
    data?.requiredCount,
  );
  const sortOrder = parseOptionalSortOrder(
    data?.sortOrder,
  );
  const note = normalizeOptionalText(data?.note);

  return withScheduleTemplateCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      await findScheduleTemplateForCinema(
        transaction,
        templateId,
        cinemaId,
        true,
      );

      const existing =
        await findScheduleTemplateJobFunctionForCinema(
          transaction,
          templateJobFunctionId,
          templateId,
          cinemaId,
        );
      const updateData: Prisma.ScheduleTemplateJobFunctionUncheckedUpdateInput =
        {};

      if (
        jobFunctionId !== undefined &&
        jobFunctionId !== null
      ) {
        await ensureActiveJobFunctionForCinema(
          transaction,
          jobFunctionId,
          cinemaId,
        );
        updateData.jobFunctionId = jobFunctionId;
      }

      if (data?.requiredCount !== undefined) {
        updateData.requiredCount = requiredCount;
      }
      if (sortOrder !== undefined) {
        updateData.sortOrder = sortOrder;
      }
      if (note !== undefined) {
        updateData.note = note;
      }

      return transaction.scheduleTemplateJobFunction.update(
        {
          where: {
            id: existing.id,
          },
          data: updateData,
          include:
            scheduleTemplateJobFunctionInclude,
        },
      );
    },
  );
}

export async function removeScheduleTemplateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);

  const cinemaId =
    getRequiredScheduleTemplateCinemaId(
      user,
      selectedCinemaId,
    );

  return withScheduleTemplateCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      await findScheduleTemplateForCinema(
        transaction,
        templateId,
        cinemaId,
        true,
      );

      const existing =
        await findScheduleTemplateJobFunctionForCinema(
          transaction,
          templateJobFunctionId,
          templateId,
          cinemaId,
        );

      return transaction.scheduleTemplateJobFunction.delete(
        {
          where: {
            id: existing.id,
          },
          include:
            scheduleTemplateJobFunctionInclude,
        },
      );
    },
  );
}
