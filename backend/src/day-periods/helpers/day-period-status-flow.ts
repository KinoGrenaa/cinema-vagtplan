import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './day-period-service-helpers';
import {
  ensureDayPeriodAdmin,
  getRequiredDayPeriodCinemaId,
} from './day-period-service-helpers';

export async function archiveDayPeriod(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureDayPeriodAdmin(user);

  const cinemaId = getRequiredDayPeriodCinemaId(user, selectedCinemaId);

  const existing = await prisma.dayPeriod.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Dagsperioden findes ikke for den valgte biograf.');
  }

  if (!existing.isActive) {
    throw new BadRequestException('Dagsperioden er allerede arkiveret.');
  }

  return prisma.dayPeriod.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
    },
  });
}

export async function reactivateDayPeriod(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureDayPeriodAdmin(user);

  const cinemaId = getRequiredDayPeriodCinemaId(user, selectedCinemaId);

  const existing = await prisma.dayPeriod.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Dagsperioden findes ikke for den valgte biograf.');
  }

  if (existing.isActive) {
    throw new BadRequestException('Dagsperioden er allerede aktiv.');
  }

  const duplicate = await prisma.dayPeriod.findFirst({
    where: {
      name: existing.name,
      isActive: true,
      id: { not: id },
      cinemaId,
    },
  });

  if (duplicate) {
    throw new BadRequestException(
      'Der findes allerede en aktiv dagsperiode med samme navn.',
    );
  }

  return prisma.dayPeriod.update({
    where: { id },
    data: {
      isActive: true,
      archivedAt: null,
    },
  });
}
