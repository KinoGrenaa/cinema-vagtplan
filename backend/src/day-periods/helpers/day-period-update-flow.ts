import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  DayPeriodUpdateData,
} from './day-period-service-helpers';
import {
  ensureDayPeriodAdmin,
  ensureDayPeriodRange,
  getRequiredDayPeriodCinemaId,
  normalizeDayPeriodName,
  parseOptionalSortOrder,
  parseRequiredMinute,
} from './day-period-service-helpers';

export async function updateDayPeriod(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: DayPeriodUpdateData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureDayPeriodAdmin(user);

  const cinemaId = getRequiredDayPeriodCinemaId(
    user,
    selectedCinemaId ?? data.cinemaId,
  );

  const existing = await prisma.dayPeriod.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Dagsperioden findes ikke for den valgte biograf.');
  }

  const name =
    data.name === undefined ? undefined : normalizeDayPeriodName(data.name);
  const startMinute =
    data.startMinute === undefined
      ? existing.startMinute
      : parseRequiredMinute(
          data.startMinute,
          'Starttidspunkt skal være et gyldigt minut.',
        );
  const endMinute =
    data.endMinute === undefined
      ? existing.endMinute
      : parseRequiredMinute(
          data.endMinute,
          'Sluttidspunkt skal være et gyldigt minut.',
        );
  const sortOrder = parseOptionalSortOrder(data.sortOrder);

  ensureDayPeriodRange(startMinute, endMinute);

  if (name && name !== existing.name) {
    const duplicate = await prisma.dayPeriod.findFirst({
      where: {
        name,
        isActive: true,
        id: { not: id },
        cinemaId,
      },
    });

    if (duplicate) {
      throw new BadRequestException('Aktiv dagsperiode findes allerede.');
    }
  }

  return prisma.dayPeriod.update({
    where: { id },
    data: {
      name,
      startMinute,
      endMinute,
      sortOrder,
    },
  });
}
