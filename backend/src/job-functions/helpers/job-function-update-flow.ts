import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  JobFunctionUpdateData,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getDayPeriodIdForCinema,
  getRequiredJobFunctionCinemaId,
  getWorkTypeIdForCinema,
  getWorkTypeIdForPayrollType,
  jobFunctionInclude,
  normalizeJobFunctionColor,
  normalizeJobFunctionName,
  normalizeOptionalText,
  parseOptionalSortOrder,
  withJobFunctionCinemaLock,
} from './job-function-service-helpers';

export async function updateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: JobFunctionUpdateData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId =
    getRequiredJobFunctionCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const name =
    data?.name === undefined
      ? undefined
      : normalizeJobFunctionName(data.name);
  const description = normalizeOptionalText(
    data?.description,
  );
  const color = normalizeJobFunctionColor(
    data?.color,
  );
  const sortOrder = parseOptionalSortOrder(
    data?.sortOrder,
  );

  return withJobFunctionCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findJobFunctionForCinema(
          transaction,
          id,
          cinemaId,
        );
      const dayPeriodId =
        data?.dayPeriodId === undefined
          ? undefined
          : await getDayPeriodIdForCinema(
              transaction,
              cinemaId,
              data.dayPeriodId,
            );
      const workTypeId =
        data?.payrollTypeId !== undefined
          ? await getWorkTypeIdForPayrollType(
              transaction,
              cinemaId,
              data.payrollTypeId,
            )
          : data?.workTypeId === undefined
            ? undefined
            : await getWorkTypeIdForCinema(
                transaction,
                cinemaId,
                data.workTypeId,
              );

      if (
        name !== undefined &&
        name !== existing.name
      ) {
        const duplicate =
          await transaction.jobFunction.findFirst({
            where: {
              name,
              isActive: true,
              id: {
                not: existing.id,
              },
              cinemaId,
            },
            select: {
              id: true,
            },
          });

        if (duplicate) {
          throw new BadRequestException(
            'Aktiv jobfunktion findes allerede.',
          );
        }
      }

      const updateData: Prisma.JobFunctionUncheckedUpdateInput =
        {};

      if (name !== undefined) {
        updateData.name = name;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (color !== undefined) {
        updateData.color = color;
      }
      if (sortOrder !== undefined) {
        updateData.sortOrder = sortOrder;
      }
      if (dayPeriodId !== undefined) {
        updateData.dayPeriodId = dayPeriodId;
      }
      if (workTypeId !== undefined) {
        updateData.workTypeId = workTypeId;
      }

      return transaction.jobFunction.update({
        where: {
          id: existing.id,
        },
        data: updateData,
        include: jobFunctionInclude,
      });
    },
  );
}
