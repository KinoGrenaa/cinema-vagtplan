import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  getRequiredScheduleTemplateCinemaId,
  normalizeOptionalText,
  normalizeScheduleTemplateName,
  normalizeWeekParity,
  parseOptionalDate,
  parseOptionalSortOrder,
  ScheduleTemplateUpdateData,
  scheduleTemplateInclude,
  withScheduleTemplateCinemaLock,
} from './schedule-template-service-helpers';

export async function updateScheduleTemplate(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: ScheduleTemplateUpdateData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);

  const cinemaId =
    getRequiredScheduleTemplateCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const updateData: Prisma.ScheduleTemplateUncheckedUpdateInput =
    {};

  const normalizedName =
    data?.name === undefined
      ? undefined
      : normalizeScheduleTemplateName(data.name);
  const description = normalizeOptionalText(
    data?.description,
  );
  const weekParity = normalizeWeekParity(
    data?.weekParity,
  );
  const startsOn = parseOptionalDate(
    data?.startsOn,
  );
  const sortOrder = parseOptionalSortOrder(
    data?.sortOrder,
  );

  if (description !== undefined) {
    updateData.description = description;
  }
  if (weekParity !== undefined) {
    updateData.weekParity = weekParity;
  }
  if (startsOn !== undefined) {
    updateData.startsOn = startsOn;
  }
  if (sortOrder !== undefined) {
    updateData.sortOrder = sortOrder;
  }

  return withScheduleTemplateCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findScheduleTemplateForCinema(
          transaction,
          id,
          cinemaId,
        );

      if (normalizedName !== undefined) {
        const duplicate =
          await transaction.scheduleTemplate.findFirst(
            {
              where: {
                cinemaId,
                name: normalizedName,
                isActive: true,
                id: {
                  not: existing.id,
                },
              },
              select: {
                id: true,
              },
            },
          );

        if (duplicate) {
          throw new BadRequestException(
            'Aktiv vagtsskabelon findes allerede.',
          );
        }

        updateData.name = normalizedName;
      }

      return transaction.scheduleTemplate.update({
        where: {
          id: existing.id,
        },
        data: updateData,
        include: scheduleTemplateInclude,
      });
    },
  );
}
