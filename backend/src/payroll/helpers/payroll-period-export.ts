import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';
import { includePendingPayrollAdjustmentsInPeriod } from './payroll-adjustment-export';
import {
  getPayrollReferenceDateFilters,
  getPeriodDates,
} from './payroll-periods';

const unresolvedTimeEntryStatuses = [
  'PENDING',
  'NEEDS_CHANGES',
] as const;

export async function ensurePayrollEntriesApproved(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  const { start, end } = getPeriodDates(startDate, endDate);
  const unresolvedEntries = await prisma.timeEntry.findMany({
    where: {
      ...getPayrollCinemaFilter(user, selectedCinemaId),
      ...(userId ? { userId: Number(userId) } : {}),
      OR: getPayrollReferenceDateFilters(start, end),
      clockOut: {
        not: null,
      },
      status: {
        in: [...unresolvedTimeEntryStatuses],
      },
    },
    include: {
      user: true,
    },
  });

  if (unresolvedEntries.length > 0) {
    const names = unresolvedEntries
      .map(
        (entry) =>
          `${entry.user.firstName} ${entry.user.lastName}`,
      )
      .filter(
        (name, index, allNames) =>
          allNames.indexOf(name) === index,
      )
      .join(', ');

    throw new BadRequestException(
      `Kan ikke eksportere.
Der findes ${unresolvedEntries.length} tidsregistreringer, som afventer godkendelse eller er sendt retur til rettelse: ${names}`,
    );
  }
}

export async function markPayrollPeriodAsExported(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  if (userId) return;

  const { start, end } = getPeriodDates(startDate, endDate);
  const cinemaId = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  ).cinemaId;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existingPeriod = await tx.payrollPeriod.findFirst({
      where: {
        cinemaId,
        startDate: start,
        endDate: end,
      },
    });
    const period = existingPeriod
      ? await tx.payrollPeriod.update({
          where: {
            id: existingPeriod.id,
          },
          data: {
            status: 'EXPORTED',
            lockedAt: existingPeriod.lockedAt || now,
            lockedByUserId:
              existingPeriod.lockedByUserId || user.sub,
            exportedAt: now,
            exportedByUserId: user.sub,
            unlockedAt: null,
            unlockedByUserId: null,
            unlockNote: null,
          },
        })
      : await tx.payrollPeriod.create({
          data: {
            cinemaId,
            startDate: start,
            endDate: end,
            status: 'EXPORTED',
            lockedAt: now,
            lockedByUserId: user.sub,
            exportedAt: now,
            exportedByUserId: user.sub,
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
    const entries = await tx.timeEntry.findMany({
      where: {
        cinemaId,
        OR: getPayrollReferenceDateFilters(start, end),
        clockOut: {
          not: null,
        },
        status: 'APPROVED',
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

    await includePendingPayrollAdjustmentsInPeriod(tx, {
      cinemaId,
      payrollPeriodId: period.id,
      periodStart: start,
      includedAt: now,
      changedByUserId: user.sub,
    });

    return period;
  });
}
