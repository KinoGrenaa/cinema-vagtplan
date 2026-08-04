import {
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';
import {
  ensurePayrollExportLockUnchanged,
  type PayrollExportLockSnapshot,
} from './payroll-export-readiness';
import {
  getPayrollPeriodTimeRange,
  getPayrollReferenceDateFilters,
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
    select: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
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

  // Alle registreringer, eksportkoder og efterreguleringer fryses ved
  // låsning. Eksporten må derfor kun ændre periodens status og må aldrig
  // hente eller tilknytte nye live-data efter det låste snapshot.
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const existingPeriod = await tx.payrollPeriod.findUnique({
      where: {
        id: lockSnapshot.periodId,
      },
      include: {
        lockedCalculationRun: { select: { checksum: true } },
      },
    });

    ensurePayrollExportLockUnchanged(
      existingPeriod,
      lockSnapshot,
    );

    return tx.payrollPeriod.update({
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
  });
}
