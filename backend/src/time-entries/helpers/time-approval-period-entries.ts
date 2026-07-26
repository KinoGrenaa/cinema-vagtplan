import { Prisma, TimeEntryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getTimeEntryCinemaFilter } from './time-entry-access';
import { getTimeEntryResponseInclude } from './time-entry-includes';
import { withTimeEntryDeviation } from './time-entry-deviation';
import { withTimeEntryPayrollExportContext } from './time-entry-payroll-export-context';
import { resolveMyTimePeriod } from './my-time-period-entries';

export type TimeApprovalPeriodOptions = {
  startDate?: string;
  endDate?: string;
};

export function buildTimeApprovalPeriodWhere(
  scope: Prisma.TimeEntryWhereInput,
  start: Date,
  endExclusive: Date,
): Prisma.TimeEntryWhereInput {
  return {
    AND: [
      scope,
      {
        OR: [
          {
            status: {
              in: [
                TimeEntryStatus.PENDING,
                TimeEntryStatus.NEEDS_CHANGES,
              ],
            },
          },
          {
            shiftId: {
              not: null,
            },
            shift: {
              startTime: {
                gte: start,
                lt: endExclusive,
              },
            },
          },
          {
            shiftId: null,
            clockIn: {
              gte: start,
              lt: endExclusive,
            },
          },
        ],
      },
    ],
  };
}

function withTimeApprovalReadContext(entry: any) {
  return withTimeEntryPayrollExportContext(
    withTimeEntryDeviation(entry),
  );
}

export async function findTimeApprovalPeriodEntries(
  prisma: PrismaService,
  user: any,
  selectedCinemaId: number | null | undefined,
  options: TimeApprovalPeriodOptions,
) {
  const cinemaFilter = getTimeEntryCinemaFilter(
    user,
    selectedCinemaId,
  );
  const scope: Prisma.TimeEntryWhereInput =
    user.role === 'EMPLOYEE'
      ? {
          userId: user.sub,
          ...cinemaFilter,
        }
      : cinemaFilter;
  const { start, endExclusive } = resolveMyTimePeriod(options);

  const entries = await prisma.timeEntry.findMany({
    where: buildTimeApprovalPeriodWhere(
      scope,
      start,
      endExclusive,
    ),
    include: getTimeEntryResponseInclude(),
    orderBy: {
      clockIn: 'desc',
    },
  });

  return entries.map(withTimeApprovalReadContext);
}
