import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ensurePayrollAccess,
  ensurePayrollAdminOrMaster,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';
import {
  ensurePayrollPeriodCanBeUnlocked,
  ensurePayrollTimeEntryCanBeUnlocked,
  getRequiredPayrollUnlockNote,
} from './payroll-period-unlock-validation';

export async function unlockPayrollPeriod(
  prisma: PrismaService,
  user: PayrollAuthUser,
  periodId: number,
  note?: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);
  ensurePayrollAdminOrMaster(user);
  const unlockNote = getRequiredPayrollUnlockNote(note);

  const period = await prisma.payrollPeriod.findUnique({
    where: {
      id: periodId,
    },
  });

  if (!period) {
    throw new NotFoundException('Lønperioden blev ikke fundet');
  }

  const cinemaId = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  ).cinemaId;

  if (period.cinemaId !== cinemaId) {
    throw new NotFoundException('Lønperioden blev ikke fundet');
  }

  ensurePayrollPeriodCanBeUnlocked(period.status);

  const now = new Date();
  const updatedPeriod = await prisma.payrollPeriod.update({
    where: {
      id: periodId,
    },
    data: {
      status: 'UNLOCKED',
      unlockedAt: now,
      unlockedByUserId: user.sub,
      unlockNote,
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
      payrollUnlockedAt: now,
      payrollLockNote: unlockNote,
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
  const unlockNote = getRequiredPayrollUnlockNote(note);

  const entry = await prisma.timeEntry.findUnique({
    where: {
      id: timeEntryId,
    },
  });

  if (!entry) {
    throw new NotFoundException(
      'Tidsregistreringen blev ikke fundet',
    );
  }

  const cinemaId = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  ).cinemaId;

  if (entry.cinemaId !== cinemaId) {
    throw new NotFoundException(
      'Tidsregistreringen blev ikke fundet',
    );
  }

  ensurePayrollTimeEntryCanBeUnlocked(entry.payrollLocked);

  return prisma.timeEntry.update({
    where: {
      id: timeEntryId,
    },
    data: {
      payrollLocked: false,
      payrollUnlockedByMaster: true,
      payrollUnlockedAt: new Date(),
      payrollLockNote: unlockNote,
    },
  });
}
