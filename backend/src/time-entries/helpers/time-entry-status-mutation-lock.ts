import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { acquirePayrollPeriodMutationLockForDate } from '../../payroll/helpers/payroll-period-mutation-lock';
import { getPayrollReferenceDate } from '../../payroll/helpers/payroll-periods';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
} from './time-entry-access';
import { getTimeEntryWithUserCinemaShiftInclude } from './time-entry-includes';

const TIME_ENTRY_NOT_FOUND_MESSAGE =
  'Tidsregistrering blev ikke fundet';

export async function withLockedTimeEntryStatusMutation<T>({
  prisma,
  initialEntry,
  user,
  selectedCinemaId,
  mutate,
}: {
  prisma: PrismaService;
  initialEntry: any;
  user: any;
  selectedCinemaId?: number | null;
  mutate: (
    tx: Prisma.TransactionClient,
    existingEntry: any,
  ) => Promise<T>;
}) {
  const initialReferenceDate =
    getPayrollReferenceDate(initialEntry);

  return prisma.$transaction(async (tx) => {
    await acquirePayrollPeriodMutationLockForDate(
      tx,
      {
        cinemaId: initialEntry.cinemaId,
        referenceDate: initialReferenceDate,
      },
    );

    const existingEntry =
      await tx.timeEntry.findUnique({
        where: {
          id: initialEntry.id,
        },
        include:
          getTimeEntryWithUserCinemaShiftInclude(),
      });

    if (!existingEntry) {
      throw new NotFoundException(
        TIME_ENTRY_NOT_FOUND_MESSAGE,
      );
    }

    const currentReferenceDate =
      getPayrollReferenceDate(existingEntry);

    if (
      currentReferenceDate.getTime() !==
      initialReferenceDate.getTime()
    ) {
      throw new ConflictException(
        'Tidsregistreringen blev ændret af en anden bruger. Hent siden igen og prøv på ny.',
      );
    }

    ensureUserCanAccessTimeEntry(
      user,
      existingEntry,
      selectedCinemaId,
    );
    ensureTimeEntryEditable(
      existingEntry,
      user,
    );

    return mutate(tx, existingEntry);
  });
}
