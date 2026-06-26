import { BadRequestException } from '@nestjs/common';

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

export async function createWorkType(
  prisma: PrismaService,
  user: AuthUser,
  data: {
    name: string;
    color?: string;
    payrollTypeId?: number | null;
    cinemaId?: CinemaContextValue;
  },
) {
  ensureWorkTypeAdmin(user);

  const cinemaId = getRequiredWorkTypeCinemaId(user, data.cinemaId);
  const payrollTypeId = await getPayrollTypeIdForCinema(
    prisma,
    cinemaId,
    data.payrollTypeId,
  );

  const existing = await prisma.workType.findFirst({
    where: {
      name: data.name,
      isActive: true,
      cinemaId,
    },
  });

  if (existing) {
    throw new BadRequestException('Aktiv vagttype findes allerede');
  }

  return prisma.workType.create({
    data: {
      name: data.name,
      color: data.color,

      cinemaId,

      payrollTypeId,
      isActive: true,
      archivedAt: null,
    },

    include: {
      payrollType: true,
    },
  });
}
