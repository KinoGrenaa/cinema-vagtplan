import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ensurePayrollAccess,
  ensurePayrollAdminOrMaster,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';

export async function unlockPayrollPeriod(
  prisma: PrismaService,
  user: PayrollAuthUser,
  periodId: number,
  note?: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);
  ensurePayrollAdminOrMaster(user);

  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period) {
    throw new NotFoundException('Lønperioden blev ikke fundet');
  }

  const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

  if (period.cinemaId !== cinemaId) {
    throw new NotFoundException('Lønperioden blev ikke fundet');
  }

  const updatedPeriod = await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: 'UNLOCKED',
      unlockedAt: new Date(),
      unlockedByUserId: user.sub,
      unlockNote: note || null,
    },
  });

  await prisma.timeEntry.updateMany({
    where: {
      payrollPeriodId: periodId,
      cinemaId,
    },
    data: {
      payrollLocked: false,
      payrollUnlockedByMaster: true,
      payrollUnlockedAt: new Date(),
      payrollLockNote: note || null,
    },
  });

  return updatedPeriod;
}

export async function unlockPayrollTimeEntry(
  prisma: PrismaService,
  user: PayrollAuthUser,
  timeEntryId: number,
  note?: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);
  ensurePayrollAdminOrMaster(user);

  const entry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
  });

  if (!entry) {
    throw new NotFoundException('Tidsregistreringen blev ikke fundet');
  }

  const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

  if (entry.cinemaId !== cinemaId) {
    throw new NotFoundException('Tidsregistreringen blev ikke fundet');
  }

  return prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: {
      payrollLocked: false,
      payrollUnlockedByMaster: true,
      payrollUnlockedAt: new Date(),
      payrollLockNote: note || null,
    },
  });
}
