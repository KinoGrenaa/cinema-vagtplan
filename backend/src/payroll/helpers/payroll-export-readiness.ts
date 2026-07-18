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
};

type PayrollPeriodSnapshotSource = {
  id: number;
  cinemaId: number;
  status: string;
  startDate: Date;
  endDate: Date;
  lockedAt: Date | null;
};

export async function getPayrollExportLockSnapshot(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
): Promise<PayrollExportLockSnapshot | null> {
  if (userId) {
    return null;
  }

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
    },
  });

  if (!period) {
    throw new BadRequestException(
      'Lås lønperioden, før den eksporteres.',
    );
  }

  if (period.status === 'EXPORTED') {
    throw new BadRequestException(
      'Lønperioden er allerede eksporteret. Genåbn og lås perioden igen, før der oprettes en ny eksport.',
    );
  }

  if (period.status !== 'LOCKED' || !period.lockedAt) {
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
  };
}

export function ensurePayrollExportLockUnchanged(
  period: PayrollPeriodSnapshotSource | null,
  snapshot: PayrollExportLockSnapshot,
) {
  const matches =
    period?.id === snapshot.periodId &&
    period.cinemaId === snapshot.cinemaId &&
    period.status === 'LOCKED' &&
    period.lockedAt?.getTime() === snapshot.lockedAtTime &&
    period.startDate.getTime() === snapshot.startDateTime &&
    period.endDate.getTime() === snapshot.endDateTime;

  if (!matches) {
    throw new ConflictException(
      'Lønperioden blev ændret, mens eksportfilen blev bygget. Kontrollér perioden og prøv igen.',
    );
  }
}
