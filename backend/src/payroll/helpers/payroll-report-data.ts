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
import { buildPayrollReportResult } from './payroll-report';

const unresolvedTimeEntryStatuses = [
  'PENDING',
  'NEEDS_CHANGES',
] as const;

function getPayrollUserInclude(cinemaId: number) {
  return {
    include: {
      cinemaMemberships: {
        where: {
          cinemaId,
        },
        select: {
          hireDate: true,
          employeeNumber: true,
          payrollEmployeeId: true,
        },
        take: 1,
      },
    },
  } as const;
}

export async function buildPayrollReportData(
  prisma: PrismaService,
  user: PayrollAuthUser,
  startDate: string,
  endDate: string,
  userId?: string,
  selectedCinemaId?: number | null,
) {
  ensurePayrollAccess(user);

  const periodDates = getPeriodDates(
    startDate,
    endDate,
  );
  const timeRange = getPayrollPeriodTimeRange(
    startDate,
    endDate,
  );
  const cinemaFilter = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  );
  const payrollUserInclude =
    getPayrollUserInclude(
      cinemaFilter.cinemaId,
    );

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...cinemaFilter,
      ...(userId
        ? {
            userId: Number(userId),
          }
        : {}),
      clockOut: {
        not: null,
      },
      status: 'APPROVED',
      OR: [
        ...getPayrollReferenceDateFilters(
          timeRange.start,
          timeRange.endExclusive,
        ),
        {
          isPayrollAdjustment: true,
          adjustmentPayrollPeriod: {
            startDate: periodDates.start,
            endDate: periodDates.end,
          },
        },
      ],
    },
    include: {
      user: payrollUserInclude,
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

  const payrollAdjustments =
    await prisma.payrollAdjustment.findMany({
      where: {
        ...cinemaFilter,
        ...(userId
          ? {
              userId: Number(userId),
            }
          : {}),
        OR: [
          {
            status: 'PENDING',
            settlementPayrollPeriodId: null,
            originalPayrollPeriod: {
              endDate: {
                lt: periodDates.start,
              },
            },
          },
          {
            status: {
              in: ['PENDING', 'INCLUDED'],
            },
            settlementPayrollPeriod: {
              startDate: periodDates.start,
              endDate: periodDates.end,
            },
          },
        ],
      },
      include: {
        user: payrollUserInclude,
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

  const pendingCount =
    await prisma.timeEntry.count({
      where: {
        ...cinemaFilter,
        ...(userId
          ? {
              userId: Number(userId),
            }
          : {}),
        OR: getPayrollReferenceDateFilters(
          timeRange.start,
          timeRange.endExclusive,
        ),
        status: {
          in: [
            ...unresolvedTimeEntryStatuses,
          ],
        },
      },
    });

  const voidedCount =
    await prisma.timeEntry.count({
      where: {
        ...cinemaFilter,
        ...(userId
          ? {
              userId: Number(userId),
            }
          : {}),
        OR: getPayrollReferenceDateFilters(
          timeRange.start,
          timeRange.endExclusive,
        ),
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
