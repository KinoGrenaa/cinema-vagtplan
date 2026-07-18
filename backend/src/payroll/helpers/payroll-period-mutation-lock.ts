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
      SELECT pg_advisory_xact_lock(
        ${cinemaKey},
        ${periodKey}
      )
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

export async function acquirePayrollPeriodMutationLockForDate(
  prisma: PayrollPeriodMutationClient,
  params: {
    cinemaId: number;
    referenceDate: Date;
  },
) {
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

  const { startDate, endDate } =
    calculatePayrollPeriodForDate(
      cinema,
      params.referenceDate,
    );
  const periodDates = getPeriodDates(
    startDate,
    endDate,
  );

  await acquirePayrollPeriodAdvisoryLock(
    prisma,
    params.cinemaId,
    periodDates.start,
  );

  const payrollPeriod =
    await prisma.payrollPeriod.findUnique({
      where: {
        cinemaId_startDate_endDate: {
          cinemaId: params.cinemaId,
          startDate: periodDates.start,
          endDate: periodDates.end,
        },
      },
    });

  return {
    payrollPeriod,
    startDate,
    endDate,
    periodDates,
  };
}
