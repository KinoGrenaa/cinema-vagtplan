import {
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calculatePayrollPeriodForDate,
  getPeriodDates,
} from './payroll-periods';
import {
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';
import { normalizePayrollDate } from './payroll-input';

export async function resolvePayrollPeriodForDate(
  prisma: PrismaService,
  user: PayrollAuthUser,
  referenceDate: string,
  selectedCinemaId?: number | null,
) {
  const cinemaId = getPayrollCinemaFilter(
    user,
    selectedCinemaId,
  ).cinemaId;
  const normalizedReferenceDate = normalizePayrollDate(
    referenceDate,
    'Ugyldig dato',
  );
  const reference = new Date(
    `${normalizedReferenceDate}T00:00:00.000Z`,
  );

  const cinema = await prisma.cinema.findUnique({
    where: {
      id: cinemaId,
    },
  });

  if (!cinema) {
    throw new NotFoundException('Biograf blev ikke fundet');
  }

  return calculatePayrollPeriodForDate(cinema, reference);
}

export async function findPayrollPeriodEntityForDate(
  prisma: PrismaService,
  cinemaId: number,
  referenceDate: Date,
) {
  const cinema = await prisma.cinema.findUnique({
    where: {
      id: cinemaId,
    },
  });

  if (!cinema) {
    throw new NotFoundException('Biograf blev ikke fundet');
  }

  const { startDate, endDate } =
    calculatePayrollPeriodForDate(cinema, referenceDate);
  const periodDates = getPeriodDates(startDate, endDate);

  return prisma.payrollPeriod.findUnique({
    where: {
      cinemaId_startDate_endDate: {
        cinemaId,
        startDate: periodDates.start,
        endDate: periodDates.end,
      },
    },
  });
}

export async function findCurrentPayrollPeriodEntity(
  prisma: PrismaService,
  cinemaId: number,
) {
  return findPayrollPeriodEntityForDate(
    prisma,
    cinemaId,
    new Date(),
  );
}
