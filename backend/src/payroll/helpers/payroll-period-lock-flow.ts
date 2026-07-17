import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getPayrollPeriodTimeRange,
  getPayrollReferenceDateFilters,
  getPeriodDates,
} from './payroll-periods';
import {
  ensurePayrollAccess,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';

export async function lockPayrollPeriod(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);

  if (
    user.role !== 'MASTER' &&
    user.role !== 'ADMIN' &&
    !user.canManagePayroll
  ) {
    throw new ForbiddenException(
      'Du har ikke adgang til at låse lønperioder',
    );
  }

  const periodDates = getPeriodDates(startDate, endDate);
  const timeRange = getPayrollPeriodTimeRange(
    startDate,
    endDate,
  );
  const cinemaId = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  ).cinemaId;
  const existingPeriod = await prisma.payrollPeriod.findFirst({
    where: {
      cinemaId,
      startDate: periodDates.start,
      endDate: periodDates.end,
    },
  });

  if (
    existingPeriod?.status === 'LOCKED' ||
    existingPeriod?.status === 'EXPORTED'
  ) {
    throw new BadRequestException(
      'Lønperioden er allerede låst',
    );
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      cinemaId,
      OR: getPayrollReferenceDateFilters(
        timeRange.start,
        timeRange.endExclusive,
      ),
      clockOut: {
        not: null,
      },
    },
    include: {
      payrollType: true,
      shift: {
        include: {
          workType: {
            include: {
              payrollType: true,
            },
          },
        },
      },
    },
  });

  const period = existingPeriod
    ? await prisma.payrollPeriod.update({
        where: {
          id: existingPeriod.id,
        },
        data: {
          status: 'LOCKED',
          lockedAt: new Date(),
          lockedByUserId: user.sub,
          exportedAt: null,
          exportedByUserId: null,
          unlockedAt: null,
          unlockedByUserId: null,
          unlockNote: null,
        },
      })
    : await prisma.payrollPeriod.create({
        data: {
          cinemaId,
          startDate: periodDates.start,
          endDate: periodDates.end,
          status: 'LOCKED',
          lockedAt: new Date(),
          lockedByUserId: user.sub,
        },
      });

  const defaultPayrollType =
    await prisma.payrollType.findFirst({
      where: {
        cinemaId,
        isDefault: true,
        isActive: true,
      },
    });

  for (const entry of entries) {
    const payrollType =
      entry.payrollType ||
      entry.shift?.workType?.payrollType ||
      defaultPayrollType;

    await prisma.timeEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        payrollPeriodId: period.id,
        payrollLocked: true,
        payrollUnlockedByMaster: false,
        payrollUnlockedAt: null,
        payrollLockNote: null,
        payrollTypeId: payrollType?.id || null,
      },
    });
  }

  return period;
}
