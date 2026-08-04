import { PrismaService } from '../../prisma/prisma.service';
import { getPeriodDates } from './payroll-periods';
import {
  ensurePayrollAccess,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';

export async function getPayrollPeriodWithTimeEntries(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);
  const { start, end } = getPeriodDates(startDate, endDate);

  return prisma.payrollPeriod.findFirst({
    where: {
      ...getPayrollCinemaFilter(user, selectedCinemaId),
      startDate: start,
      endDate: end,
    },
    include: {
      lockedCalculationRun: {
        include: {
          payrollConfigurationVersion: true,
          lines: { orderBy: [{ segmentStart: 'asc' }, { id: 'asc' }] },
        },
      },
    },
  });
}
