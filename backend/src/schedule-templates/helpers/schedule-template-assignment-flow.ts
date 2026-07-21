import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureAssignableUserForJobFunction,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  findScheduleTemplateJobFunctionForCinema,
  getRequiredScheduleTemplateCinemaId,
  parseOptionalSortOrder,
  parseRequiredPositiveId,
  ScheduleTemplateAssignmentData,
  scheduleTemplateJobFunctionInclude,
  withScheduleTemplateCinemaLock,
} from './schedule-template-service-helpers';

export async function addScheduleTemplateAssignment(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  data: ScheduleTemplateAssignmentData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);

  const cinemaId =
    getRequiredScheduleTemplateCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const userId = parseRequiredPositiveId(
    data?.userId,
    'Medarbejder skal være et gyldigt ID.',
  );
  const sortOrder =
    parseOptionalSortOrder(data?.sortOrder) ?? 0;

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

      const templateJobFunction =
        await findScheduleTemplateJobFunctionForCinema(
          transaction,
          templateJobFunctionId,
          templateId,
          cinemaId,
        );

      await ensureAssignableUserForJobFunction(
        transaction,
        userId,
        templateJobFunction.jobFunctionId,
        cinemaId,
      );

      const duplicate =
        await transaction.scheduleTemplateAssignment.findFirst(
          {
            where: {
              templateJobFunctionId:
                templateJobFunction.id,
              userId,
            },
            select: {
              id: true,
            },
          },
        );

      if (duplicate) {
        throw new BadRequestException(
          'Medarbejderen er allerede standardmedarbejder på denne linje.',
        );
      }

      await transaction.scheduleTemplateAssignment.create(
        {
          data: {
            cinemaId,
            templateJobFunctionId:
              templateJobFunction.id,
            userId,
            sortOrder,
          },
        },
      );

      return transaction.scheduleTemplateJobFunction.findUnique(
        {
          where: {
            id: templateJobFunction.id,
          },
          include:
            scheduleTemplateJobFunctionInclude,
        },
      );
    },
  );
}

export async function removeScheduleTemplateAssignment(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  assignmentId: number,
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

      const templateJobFunction =
        await findScheduleTemplateJobFunctionForCinema(
          transaction,
          templateJobFunctionId,
          templateId,
          cinemaId,
        );
      const assignment =
        await transaction.scheduleTemplateAssignment.findFirst(
          {
            where: {
              id: assignmentId,
              cinemaId,
              templateJobFunctionId:
                templateJobFunction.id,
            },
            select: {
              id: true,
            },
          },
        );

      if (!assignment) {
        throw new BadRequestException(
          'Standardmedarbejderen findes ikke på denne skabelonlinje.',
        );
      }

      await transaction.scheduleTemplateAssignment.delete(
        {
          where: {
            id: assignment.id,
          },
        },
      );

      return transaction.scheduleTemplateJobFunction.findUnique(
        {
          where: {
            id: templateJobFunction.id,
          },
          include:
            scheduleTemplateJobFunctionInclude,
        },
      );
    },
  );
}
