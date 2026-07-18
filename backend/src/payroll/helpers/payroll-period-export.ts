import {
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';
import { includePendingPayrollAdjustmentsInPeriod } from './payroll-adjustment-export';
import {
  ensurePayrollExportLockUnchanged,
  type PayrollExportLockSnapshot,
} from './payroll-export-readiness';
import {
  getPayrollPeriodTimeRange,
  getPayrollReferenceDateFilters,
  getPeriodDates,
} from './payroll-periods';

const unresolvedTimeEntryStatuses = [
  'PENDING',
  'NEEDS_CHANGES',
] as const;

type PayrollResolutionOperation = 'EXPORT' | 'LOCK';

export async function ensurePayrollEntriesApproved(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
  operation: PayrollResolutionOperation = 'EXPORT',
) {
  const timeRange = getPayrollPeriodTimeRange(
    startDate,
    endDate,
  );
  const unresolvedEntries = await prisma.timeEntry.findMany({
    where: {
      ...getPayrollCinemaFilter(user, selectedCinemaId),
      ...(userId ? { userId: Number(userId) } : {}),
      OR: getPayrollReferenceDateFilters(
        timeRange.start,
        timeRange.endExclusive,
      ),
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
    const action =
      operation === 'LOCK'
        ? 'låse lønperioden'
        : 'eksportere';

    throw new BadRequestException(
      `Kan ikke ${action}.
Der findes ${unresolvedEntries.length} tidsregistreringer, som stadig er åbne, afventer godkendelse eller er sendt retur til rettelse: ${names}`,
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
  lockSnapshot?: PayrollExportLockSnapshot | null,
) {
  if (userId) {
    return;
  }

  if (!lockSnapshot) {
    throw new BadRequestException(
      'Lås lønperioden, før den eksporteres.',
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
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existingPeriod = await tx.payrollPeriod.findUnique({
      where: {
        id: lockSnapshot.periodId,
      },
    });

    ensurePayrollExportLockUnchanged(
      existingPeriod,
      lockSnapshot,
    );

    const period = await tx.payrollPeriod.update({
      where: {
        id: existingPeriod!.id,
      },
      data: {
        status: 'EXPORTED',
        exportedAt: now,
        exportedByUserId: user.sub,
        unlockedAt: null,
        unlockedByUserId: null,
        unlockNote: null,
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
        OR: getPayrollReferenceDateFilters(
          timeRange.start,
          timeRange.endExclusive,
        ),
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
      periodStart: periodDates.start,
      includedAt: now,
      changedByUserId: user.sub,
    });

    return period;
  });
}
