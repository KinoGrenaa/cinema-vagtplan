import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { acquirePayrollPeriodMutationLockForDate } from '../../payroll/helpers/payroll-period-mutation-lock';

export async function ensureTimeEntryCreationPeriodWritable(
  prisma: Prisma.TransactionClient,
  params: {
    cinemaId: number;
    referenceDate: Date;
  },
) {
  const { payrollPeriod } =
    await acquirePayrollPeriodMutationLockForDate(
      prisma,
      params,
    );

  if (payrollPeriod?.status !== 'LOCKED') {
    return payrollPeriod;
  }

  throw new BadRequestException(
    'Lønperioden er låst. Genåbn lønperioden, før der oprettes en tidsregistrering i perioden.',
  );
}
