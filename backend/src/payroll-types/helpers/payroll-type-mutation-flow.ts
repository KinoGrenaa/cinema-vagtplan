import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensurePayrollTypeAdmin,
  getRequiredPayrollTypeCinemaId,
} from './payroll-type-access';

export async function updatePayrollType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  data: {
    name?: string;
    payrollCode?: string;
    exportCode?: string;
    description?: string;
    color?: string;
    isDefault?: boolean;
    isActive?: boolean;
    cinemaId?: CinemaContextValue;
  },
  selectedCinemaId?: CinemaContextValue,
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId = getRequiredPayrollTypeCinemaId(
    user,
    selectedCinemaId ?? data.cinemaId,
  );

  const existing = await prisma.payrollType.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Lønart blev ikke fundet');
  }

  if (data.isDefault) {
    await prisma.payrollType.updateMany({
      where: {
        cinemaId: existing.cinemaId,
      },
      data: {
        isDefault: false,
      },
    });
  }

  return prisma.payrollType.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      payrollCode: data.payrollCode,
      exportCode: data.exportCode,
      description: data.description,
      color: data.color,
      isDefault: data.isDefault,
      isActive: data.isActive,
    },
  });
}

export async function removePayrollType(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId = getRequiredPayrollTypeCinemaId(user, selectedCinemaId);

  const existing = await prisma.payrollType.findFirst({
    where: {
      id,
      cinemaId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Lønart blev ikke fundet');
  }

  return prisma.payrollType.delete({
    where: {
      id,
    },
  });
}
