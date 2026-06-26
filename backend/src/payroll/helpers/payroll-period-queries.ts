import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { calculatePayrollPeriodForDate } from './payroll-periods';
import {
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';

export async function resolvePayrollPeriodForDate(
  prisma: PrismaService,
  user: PayrollAuthUser,
  referenceDate: string,
  selectedCinemaId?: number | null,
) {
  const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

  const reference = new Date(`${referenceDate}T00:00:00.000Z`);

  if (Number.isNaN(reference.getTime())) {
    throw new BadRequestException('Ugyldig dato');
  }

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
    where: { id: cinemaId },
  });

  if (!cinema) {
    throw new NotFoundException('Biograf blev ikke fundet');
  }

  const { startDate, endDate } = calculatePayrollPeriodForDate(
    cinema,
    referenceDate,
  );

  return prisma.payrollPeriod.findUnique({
    where: {
      cinemaId_startDate_endDate: {
        cinemaId,
        startDate: new Date(`${startDate}T00:00:00`),
        endDate: new Date(`${endDate}T23:59:59`),
      },
    },
  });
}

export async function findCurrentPayrollPeriodEntity(
  prisma: PrismaService,
  cinemaId: number,
) {
  return findPayrollPeriodEntityForDate(prisma, cinemaId, new Date());
}

export async function getPayrollRulesEnabled(
  prisma: PrismaService,
  user: PayrollAuthUser,
  selectedCinemaId?: number | null,
): Promise<boolean> {
  const cinemaId = getPayrollCinemaFilter(user, selectedCinemaId).cinemaId;

  const cinema = await prisma.cinema.findUnique({
    where: {
      id: cinemaId,
    },
  });

  return Boolean((cinema as any)?.payrollRulesEnabled);
}
