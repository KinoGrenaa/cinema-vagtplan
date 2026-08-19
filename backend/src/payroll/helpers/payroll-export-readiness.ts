import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';
import { getPeriodDates } from './payroll-periods';

export type PayrollExportLockSnapshot = {
  periodId: number;
  cinemaId: number;
  startDateTime: number;
  endDateTime: number;
  lockedAtTime: number;
  lockedCalculationRunId: number;
  calculationChecksum: string;
};

type PayrollPeriodSnapshotSource = {
  id: number;
  cinemaId: number;
  status: string;
  startDate: Date;
  endDate: Date;
  lockedAt: Date | null;
  lockedCalculationRunId: number | null;
  lockedCalculationRun?: { checksum: string } | null;
};

export async function getPayrollExportLockSnapshot(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
): Promise<PayrollExportLockSnapshot | null> {
  const periodDates = getPeriodDates(startDate, endDate);
  const cinemaId = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  ).cinemaId;
  const period = await prisma.payrollPeriod.findFirst({
    where: {
      cinemaId,
      startDate: periodDates.start,
      endDate: periodDates.end,
    },
    select: {
      id: true,
      cinemaId: true,
      status: true,
      startDate: true,
      endDate: true,
      lockedAt: true,
      lockedCalculationRunId: true,
      lockedCalculationRun: { select: { checksum: true } },
    },
  });

  if (!period) {
    throw new BadRequestException(
      'Lås lønperioden, før den eksporteres.',
    );
  }

  if (
    !['LOCKED', 'EXPORTED'].includes(period.status) ||
    !period.lockedAt ||
    !period.lockedCalculationRunId ||
    !period.lockedCalculationRun
  ) {
    throw new BadRequestException(
      'Lås lønperioden, før den eksporteres.',
    );
  }

  return {
    periodId: period.id,
    cinemaId: period.cinemaId,
    startDateTime: period.startDate.getTime(),
    endDateTime: period.endDate.getTime(),
    lockedAtTime: period.lockedAt.getTime(),
    lockedCalculationRunId: period.lockedCalculationRunId,
    calculationChecksum: period.lockedCalculationRun.checksum,
  };
}

export function ensurePayrollExportLockUnchanged(
  period: PayrollPeriodSnapshotSource | null,
  snapshot: PayrollExportLockSnapshot,
) {
  const matches =
    period?.id === snapshot.periodId &&
    period.cinemaId === snapshot.cinemaId &&
    ['LOCKED', 'EXPORTED'].includes(period.status) &&
    period.lockedAt?.getTime() === snapshot.lockedAtTime &&
    period.startDate.getTime() === snapshot.startDateTime &&
    period.endDate.getTime() === snapshot.endDateTime &&
    period.lockedCalculationRunId === snapshot.lockedCalculationRunId &&
    period.lockedCalculationRun?.checksum === snapshot.calculationChecksum;

  if (!matches) {
    throw new ConflictException(
      'Lønperioden blev ændret, mens eksportfilen blev bygget. Kontrollér perioden og prøv igen.',
    );
  }
}
