import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  DayPeriodCreateData,
} from './day-period-service-helpers';
import {
  ensureDayPeriodAdmin,
  ensureDayPeriodRange,
  getRequiredDayPeriodCinemaId,
  normalizeDayPeriodName,
  parseOptionalSortOrder,
  parseRequiredMinute,
  withDayPeriodCinemaLock,
} from './day-period-service-helpers';

export async function createDayPeriod(
  prisma: PrismaService,
  user: AuthUser,
  data: DayPeriodCreateData,
) {
  ensureDayPeriodAdmin(user);

  const cinemaId =
    getRequiredDayPeriodCinemaId(
      user,
      data?.cinemaId,
    );
  const name = normalizeDayPeriodName(
    data?.name,
  );
  const startMinute = parseRequiredMinute(
    data?.startMinute,
    'Starttidspunkt skal være et gyldigt minut.',
  );
  const endMinute = parseRequiredMinute(
    data?.endMinute,
    'Sluttidspunkt skal være et gyldigt minut.',
  );
  const sortOrder =
    parseOptionalSortOrder(data?.sortOrder) ?? 0;

  ensureDayPeriodRange(
    startMinute,
    endMinute,
  );

  return withDayPeriodCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      const existing =
        await transaction.dayPeriod.findFirst({
          where: {
            name,
            isActive: true,
            cinemaId,
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        throw new BadRequestException(
          'Aktiv dagsperiode findes allerede.',
        );
      }

      return transaction.dayPeriod.create({
        data: {
          name,
          startMinute,
          endMinute,
          sortOrder,
          cinemaId,
          isActive: true,
          archivedAt: null,
        },
      });
    },
  );
}
