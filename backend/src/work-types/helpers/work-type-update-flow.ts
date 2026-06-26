import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './work-type-service-helpers';
import {
  ensureWorkTypeAdmin,
  getPayrollTypeIdForCinema,
  getRequiredWorkTypeCinemaId,
} from './work-type-service-helpers';

export async function updateWorkType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: {
    name?: string;
    color?: string;
    payrollTypeId?: number | null;
    cinemaId?: CinemaContextValue;
  },
  selectedCinemaId?: CinemaContextValue,
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(
    user,
    selectedCinemaId ?? data.cinemaId,
  );

  const existing = await prisma.workType.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Vagttype blev ikke fundet');
  }

  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.workType.findFirst({
      where: {
        name: data.name,
        isActive: true,
        id: {
          not: id,
        },
        cinemaId,
      },
    });

    if (duplicate) {
      throw new BadRequestException('Aktiv vagttype findes allerede');
    }
  }

  const payrollTypeId =
    data.payrollTypeId === undefined
      ? undefined
      : await getPayrollTypeIdForCinema(
          prisma,
          cinemaId,
          data.payrollTypeId,
        );

  return prisma.workType.update({
    where: {
      id,
    },

    data: {
      name: data.name,
      color: data.color,
      payrollTypeId,
    },

    include: {
      payrollType: true,
    },
  });
}
