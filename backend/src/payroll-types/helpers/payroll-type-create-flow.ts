import { BadRequestException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensurePayrollTypeAdmin,
  getRequiredPayrollTypeCinemaId,
} from './payroll-type-access';

export async function createPayrollType(
  prisma: PrismaService,
  user: AuthUser,
  data: {
    name: string;
    payrollCode: string;
    exportCode?: string;
    description?: string;
    color?: string;
    isDefault?: boolean;
    cinemaId?: CinemaContextValue;
  },
) {
  ensurePayrollTypeAdmin(user);

  const cinemaId = getRequiredPayrollTypeCinemaId(user, data.cinemaId);

  const existing = await prisma.payrollType.findFirst({
    where: {
      cinemaId,
      payrollCode: data.payrollCode,
    },
  });

  if (existing) {
    throw new BadRequestException('Lønart med denne kode findes allerede');
  }

  if (data.isDefault) {
    await prisma.payrollType.updateMany({
      where: {
        cinemaId,
      },
      data: {
        isDefault: false,
      },
    });
  }

  return prisma.payrollType.create({
    data: {
      cinemaId,
      name: data.name,
      payrollCode: data.payrollCode,
      exportCode: data.exportCode,
      description: data.description,
      color: data.color,
      isDefault: data.isDefault || false,
    },
  });
}
