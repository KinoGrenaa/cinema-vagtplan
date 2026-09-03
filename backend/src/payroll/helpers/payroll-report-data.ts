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
import { calculatePayrollPeriod } from './payroll-calculation';
import { addPayrollCalculationToReport } from './payroll-calculation-report';

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
  const periodStatus = await prisma.payrollPeriod.findFirst({
    where: {
      ...cinemaFilter,
      startDate: periodDates.start,
      endDate: periodDates.end,
    },
    select: { id: true, status: true },
  });
  const periodIsClosed =
    periodStatus?.status === 'LOCKED' ||
    periodStatus?.status === 'EXPORTED';
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
      ...(periodIsClosed && periodStatus
        ? {
            payrollPeriodId: periodStatus.id,
          }
        : {
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
          }),
    },
    include: {
      user: payrollUserInclude,
      payrollType: true,
      cinema: {
        select: {
          timeEntryMinuteStep: true,
        },
      },
      shift: {
        include: {
          jobFunction: {
            include: {
              defaultPayrollExportCode: true,
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
        ...(periodIsClosed
          ? {
              status: 'INCLUDED',
              settlementPayrollPeriod: {
                startDate: periodDates.start,
                endDate: periodDates.end,
              },
            }
          : {
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
            }),
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
                jobFunction: {
                  include: {
                    defaultPayrollExportCode: true,
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
  const baseReport = buildPayrollReportResult(
    entries,
    payrollAdjustments,
    pendingCount,
    voidedCount,
  );
  const period = await prisma.payrollPeriod.findFirst({
    where: {
      ...cinemaFilter,
      startDate: periodDates.start,
      endDate: periodDates.end,
    },
    include: {
      lockedCalculationRun: {
        include: {
          payrollConfigurationVersion: true,
          lines: {
            orderBy: [{ segmentStart: 'asc' }, { id: 'asc' }],
            include: {
              payrollType: true,
              payRuleVersion: { include: { payRule: true } },
              membership: { select: { userId: true, employeeNumber: true, payrollEmployeeId: true } },
            },
          },
        },
      },
    },
  });

  if (period?.lockedCalculationRun) {
    return {
      ...addPayrollCalculationToReport(baseReport, period.lockedCalculationRun, {
        useSnapshotAdjustments: true,
      }),
      payrollMode: period.lockedCalculationRun.payrollConfigurationVersion.mode,
      payrollCalculation: period.lockedCalculationRun,
      calculationError: null,
    };
  }

  try {
    const calculation = await calculatePayrollPeriod(prisma, {
      cinemaId: cinemaFilter.cinemaId,
      startDate,
      endDate,
      userId: userId ? Number(userId) : null,
    });
    const configuration = await prisma.cinemaPayrollConfigurationVersion.findUnique({
      where: { id: calculation.configurationVersionId },
      select: { mode: true },
    });
    const payrollTypeIds = Array.from(
      new Set(
        calculation.lines
          .map((line) => line.payrollTypeId)
          .filter((id): id is number => Number.isInteger(id)),
      ),
    );
    const payrollTypes = payrollTypeIds.length
      ? await prisma.payrollType.findMany({ where: { id: { in: payrollTypeIds } } })
      : [];
    const payrollTypeById = new Map(payrollTypes.map((payrollType) => [payrollType.id, payrollType]));
    const hydratedCalculation = {
      status: 'PREVIEW',
      ...calculation,
      lines: calculation.lines.map((line) => ({
        ...line,
        payrollType: line.payrollTypeId
          ? payrollTypeById.get(line.payrollTypeId) ?? null
          : null,
      })),
    };
    return {
      ...addPayrollCalculationToReport(baseReport, hydratedCalculation),
      payrollMode: configuration?.mode ?? 'HOURS_ONLY',
      payrollCalculation: hydratedCalculation,
      calculationError: null,
    };
  } catch (error) {
    return {
      ...baseReport,
      payrollMode: null,
      payrollCalculation: null,
      calculationError:
        error instanceof Error ? error.message : 'Lønberegningen kunne ikke gennemføres.',
    };
  }
}
