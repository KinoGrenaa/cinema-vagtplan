import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { findPayrollPeriodEntityForDate } from '../../payroll/helpers/payroll-period-queries';

export async function ensureTimeEntryCreationPeriodWritable(
  prisma: PrismaService,
  params: {
    cinemaId: number;
    referenceDate: Date;
  },
) {
  const payrollPeriod =
    await findPayrollPeriodEntityForDate(
      prisma,
      params.cinemaId,
      params.referenceDate,
    );

  if (payrollPeriod?.status !== 'LOCKED') {
    return payrollPeriod;
  }

  throw new BadRequestException(
    'Lønperioden er låst. Genåbn lønperioden, før der oprettes en tidsregistrering i perioden.',
  );
}
