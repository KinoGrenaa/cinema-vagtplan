import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  calculatePayrollPeriodForDate,
  getPeriodDates,
} from './payroll-periods';

type PayrollPeriodMutationClient = Pick<
  Prisma.TransactionClient,
  '$queryRaw' | 'cinema' | 'payrollPeriod'
>;

export type PayrollPeriodMutationDateLock = {
  referenceDate: Date;
  startDate: string;
  endDate: string;
  periodDates: {
    start: Date;
    end: Date;
  };
  payrollPeriod: any | null;
};

export function getPayrollPeriodAdvisoryLockKey(
  cinemaId: number,
  periodStart: Date,
) {
  return {
    cinemaKey: cinemaId,
    periodKey: Math.floor(
      periodStart.getTime() / (24 * 60 * 60 * 1000),
    ),
  };
}

async function acquirePayrollPeriodAdvisoryLock(
  prisma: PayrollPeriodMutationClient,
  cinemaId: number,
  periodStart: Date,
) {
  const { cinemaKey, periodKey } =
    getPayrollPeriodAdvisoryLockKey(
      cinemaId,
      periodStart,
    );

  await prisma.$queryRaw(
    Prisma.sql`
      SELECT 1::integer AS locked
      FROM (
        SELECT pg_advisory_xact_lock(
          CAST(${cinemaKey} AS integer),
          CAST(${periodKey} AS integer)
        )
      ) AS advisory_lock
    `,
  );
}

export async function acquirePayrollPeriodMutationLockForPeriod(
  prisma: PayrollPeriodMutationClient,
  params: {
    cinemaId: number;
    startDate: string;
    endDate: string;
  },
) {
  const periodDates = getPeriodDates(
    params.startDate,
    params.endDate,
  );

  await acquirePayrollPeriodAdvisoryLock(
    prisma,
    params.cinemaId,
    periodDates.start,
  );

  return periodDates;
}

export async function acquirePayrollPeriodMutationLocksForDates(
  prisma: PayrollPeriodMutationClient,
  params: {
    cinemaId: number;
    referenceDates: Date[];
  },
): Promise<PayrollPeriodMutationDateLock[]> {
  const cinema = await prisma.cinema.findUnique({
    where: {
      id: params.cinemaId,
    },
  });

  if (!cinema) {
    throw new NotFoundException(
      'Biograf blev ikke fundet',
    );
  }

  const resolvedTargets = params.referenceDates.map(
    (referenceDate) => {
      const { startDate, endDate } =
        calculatePayrollPeriodForDate(
          cinema,
          referenceDate,
        );

      return {
        referenceDate,
        startDate,
        endDate,
        periodDates: getPeriodDates(
          startDate,
          endDate,
        ),
      };
    },
  );

  const uniqueTargets = Array.from(
    new Map(
      resolvedTargets.map((target) => [
        target.periodDates.start.getTime(),
        target,
      ]),
    ).values(),
  ).sort(
    (left, right) =>
      left.periodDates.start.getTime() -
      right.periodDates.start.getTime(),
  );

  for (const target of uniqueTargets) {
    await acquirePayrollPeriodAdvisoryLock(
      prisma,
      params.cinemaId,
      target.periodDates.start,
    );
  }

  const payrollPeriodsByStart = new Map<
    number,
    any | null
  >();

  for (const target of uniqueTargets) {
    const payrollPeriod =
      await prisma.payrollPeriod.findUnique({
        where: {
          cinemaId_startDate_endDate: {
            cinemaId: params.cinemaId,
            startDate: target.periodDates.start,
            endDate: target.periodDates.end,
          },
        },
      });

    payrollPeriodsByStart.set(
      target.periodDates.start.getTime(),
      payrollPeriod,
    );
  }

  return resolvedTargets.map((target) => ({
    ...target,
    payrollPeriod:
      payrollPeriodsByStart.get(
        target.periodDates.start.getTime(),
      ) ?? null,
  }));
}

export async function acquirePayrollPeriodMutationLockForDate(
  prisma: PayrollPeriodMutationClient,
  params: {
    cinemaId: number;
    referenceDate: Date;
  },
) {
  const [lockedPeriod] =
    await acquirePayrollPeriodMutationLocksForDates(
      prisma,
      {
        cinemaId: params.cinemaId,
        referenceDates: [params.referenceDate],
      },
    );

  return lockedPeriod;
}
