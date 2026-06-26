import { PrismaService } from '../../prisma/prisma.service';
import { getPeriodDates } from './payroll-periods';
import {
  ensurePayrollAccess,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';

export async function getPayrollAuditHistoryData(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);

  const { start, end } = getPeriodDates(startDate, endDate);

  const periods = await prisma.payrollPeriod.findMany({
    where: {
      ...getPayrollCinemaFilter(user, selectedCinemaId),
      startDate: {
        gte: start,
      },
      endDate: {
        lte: end,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return periods.map((period) => ({
    id: period.id,
    status: period.status,
    startDate: period.startDate,
    endDate: period.endDate,
    lockedAt: period.lockedAt,
    lockedByUserId: period.lockedByUserId,
    exportedAt: period.exportedAt,
    exportedByUserId: period.exportedByUserId,
    unlockedAt: period.unlockedAt,
    unlockedByUserId: period.unlockedByUserId,
    unlockNote: period.unlockNote,
  }));
}
