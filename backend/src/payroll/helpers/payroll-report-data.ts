import { PrismaService } from '../../prisma/prisma.service';
import {
  getPayrollReferenceDateFilters,
  getPeriodDates,
} from './payroll-periods';
import {
  ensurePayrollAccess,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';
import { buildPayrollReportResult } from './payroll-report';

export async function buildPayrollReportData(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);

  const { start, end } = getPeriodDates(startDate, endDate);

  const cinemaFilter = getPayrollCinemaFilter(user, selectedCinemaId);

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...cinemaFilter,
      ...(userId ? { userId: Number(userId) } : {}),
      clockOut: {
        not: null,
      },
      status: 'APPROVED',
      OR: [
        ...getPayrollReferenceDateFilters(start, end),
        {
          isPayrollAdjustment: true,
          adjustmentPayrollPeriod: {
            startDate: start,
            endDate: end,
          },
        },
      ],
    },
    include: {
      user: true,
      payrollPeriod: true,
      originalPayrollPeriod: true,
      adjustmentPayrollPeriod: true,
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
    orderBy: {
      clockIn: 'asc',
    },
  });

  const payrollAdjustments = await prisma.payrollAdjustment.findMany({
    where: {
      ...cinemaFilter,
      ...(userId ? { userId: Number(userId) } : {}),
      status: 'PENDING',
      settlementPayrollPeriodId: null,
      originalPayrollPeriod: {
        endDate: {
          lt: start,
        },
      },
    },
    include: {
      user: true,
      payrollType: true,
      originalPayrollPeriod: true,
      settlementPayrollPeriod: true,
      timeEntry: {
        include: {
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
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const pendingCount = await prisma.timeEntry.count({
    where: {
      ...cinemaFilter,
      ...(userId ? { userId: Number(userId) } : {}),
      OR: getPayrollReferenceDateFilters(start, end),
      clockOut: {
        not: null,
      },
      status: 'PENDING',
    },
  });

  const voidedCount = await prisma.timeEntry.count({
    where: {
      ...cinemaFilter,
      ...(userId ? { userId: Number(userId) } : {}),
      OR: getPayrollReferenceDateFilters(start, end),
      clockOut: {
        not: null,
      },
      status: 'VOIDED',
    },
  });

  return buildPayrollReportResult(
    entries,
    payrollAdjustments,
    pendingCount,
    voidedCount,
  );
}
