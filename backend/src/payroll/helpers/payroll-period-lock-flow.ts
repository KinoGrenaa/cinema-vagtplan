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
import { ensurePayrollEntriesApproved } from './payroll-period-export';

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

  await ensurePayrollEntriesApproved(
    prisma,
    user,
    startDate,
    endDate,
    undefined,
    selectedCinemaId,
    'LOCK',
  );

  const periodDates = getPeriodDates(startDate, endDate);
  const timeRange = getPayrollPeriodTimeRange(
    startDate,
    endDate,
  );
  const cinemaId = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  ).cinemaId;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existingPeriod = await tx.payrollPeriod.findFirst({
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

    const entries = await tx.timeEntry.findMany({
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

    const defaultPayrollType =
      await tx.payrollType.findFirst({
        where: {
          cinemaId,
          isDefault: true,
          isActive: true,
        },
      });

    const period = existingPeriod
      ? await tx.payrollPeriod.update({
          where: {
            id: existingPeriod.id,
          },
          data: {
            status: 'LOCKED',
            lockedAt: now,
            lockedByUserId: user.sub,
            exportedAt: null,
            exportedByUserId: null,
            unlockedAt: null,
            unlockedByUserId: null,
            unlockNote: null,
          },
        })
      : await tx.payrollPeriod.create({
          data: {
            cinemaId,
            startDate: periodDates.start,
            endDate: periodDates.end,
            status: 'LOCKED',
            lockedAt: now,
            lockedByUserId: user.sub,
          },
        });

    for (const entry of entries) {
      const payrollType =
        entry.payrollType ||
        entry.shift?.workType?.payrollType ||
        defaultPayrollType;

      await tx.timeEntry.update({
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
  });
}
