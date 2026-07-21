import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './day-period-service-helpers';
import {
  ensureDayPeriodAdmin,
  findDayPeriodForCinema,
  getRequiredDayPeriodCinemaId,
  withDayPeriodCinemaLock,
} from './day-period-service-helpers';

export async function archiveDayPeriod(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureDayPeriodAdmin(user);

  const cinemaId =
    getRequiredDayPeriodCinemaId(
      user,
      selectedCinemaId,
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

      if (!existing.isActive) {
        throw new BadRequestException(
          'Dagsperioden er allerede arkiveret.',
        );
      }

      return transaction.dayPeriod.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: false,
          archivedAt: new Date(),
        },
      });
    },
  );
}

export async function reactivateDayPeriod(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureDayPeriodAdmin(user);

  const cinemaId =
    getRequiredDayPeriodCinemaId(
      user,
      selectedCinemaId,
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

      if (existing.isActive) {
        throw new BadRequestException(
          'Dagsperioden er allerede aktiv.',
        );
      }

      const duplicate =
        await transaction.dayPeriod.findFirst({
          where: {
            name: existing.name,
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
          'Der findes allerede en aktiv dagsperiode med samme navn.',
        );
      }

      return transaction.dayPeriod.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive: true,
          archivedAt: null,
        },
      });
    },
  );
}
