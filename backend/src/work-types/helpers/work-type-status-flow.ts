import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './work-type-service-helpers';
import {
  ensureWorkTypeAdmin,
  getRequiredWorkTypeCinemaId,
} from './work-type-service-helpers';

export async function archiveWorkType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(user, selectedCinemaId);

  const existing = await prisma.workType.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Vagttype blev ikke fundet');
  }

  if (!existing.isActive) {
    throw new BadRequestException('Vagttypen er allerede arkiveret');
  }

  return prisma.workType.update({
    where: {
      id,
    },

    data: {
      isActive: false,
      archivedAt: new Date(),
    },

    include: {
      payrollType: true,
    },
  });
}

export async function reactivateWorkType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(user, selectedCinemaId);

  const existing = await prisma.workType.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Vagttype blev ikke fundet');
  }

  if (existing.isActive) {
    throw new BadRequestException('Vagttypen er allerede aktiv');
  }

  const duplicate = await prisma.workType.findFirst({
    where: {
      name: existing.name,
      isActive: true,
      id: {
        not: id,
      },
      cinemaId,
    },
  });

  if (duplicate) {
    throw new BadRequestException(
      'Der findes allerede en aktiv vagttype med samme navn',
    );
  }

  return prisma.workType.update({
    where: {
      id,
    },

    data: {
      isActive: true,
      archivedAt: null,
    },

    include: {
      payrollType: true,
    },
  });
}
