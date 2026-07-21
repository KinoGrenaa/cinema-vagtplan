import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  DayPeriodUpdateData,
} from './day-period-service-helpers';
import {
  ensureDayPeriodAdmin,
  ensureDayPeriodRange,
  findDayPeriodForCinema,
  getRequiredDayPeriodCinemaId,
  normalizeDayPeriodName,
  parseOptionalSortOrder,
  parseRequiredMinute,
  withDayPeriodCinemaLock,
} from './day-period-service-helpers';

export async function updateDayPeriod(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: DayPeriodUpdateData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureDayPeriodAdmin(user);

  const cinemaId =
    getRequiredDayPeriodCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const name =
    data?.name === undefined
      ? undefined
      : normalizeDayPeriodName(data.name);
  const sortOrder = parseOptionalSortOrder(
    data?.sortOrder,
  );

  return withDayPeriodCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await findDayPeriodForCinema(
          transaction,
          id,
          cinemaId,
        );
      const startMinute =
        data?.startMinute === undefined
          ? existing.startMinute
          : parseRequiredMinute(
              data.startMinute,
              'Starttidspunkt skal være et gyldigt minut.',
            );
      const endMinute =
        data?.endMinute === undefined
          ? existing.endMinute
          : parseRequiredMinute(
              data.endMinute,
              'Sluttidspunkt skal være et gyldigt minut.',
            );

      ensureDayPeriodRange(
        startMinute,
        endMinute,
      );

      if (
        name !== undefined &&
        name !== existing.name
      ) {
        const duplicate =
          await transaction.dayPeriod.findFirst({
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
            'Aktiv dagsperiode findes allerede.',
          );
        }
      }

      const updateData: Prisma.DayPeriodUncheckedUpdateInput =
        {
          startMinute,
          endMinute,
        };

      if (name !== undefined) {
        updateData.name = name;
      }
      if (sortOrder !== undefined) {
        updateData.sortOrder = sortOrder;
      }

      return transaction.dayPeriod.update({
        where: {
          id: existing.id,
        },
        data: updateData,
      });
    },
  );
}
