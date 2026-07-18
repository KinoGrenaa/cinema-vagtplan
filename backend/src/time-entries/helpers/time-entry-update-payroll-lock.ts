import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  acquirePayrollPeriodMutationLocksForDates,
  type PayrollPeriodMutationDateLock,
} from '../../payroll/helpers/payroll-period-mutation-lock';
import { getTimeEntryWithUserCinemaShiftInclude } from './time-entry-includes';

const TIME_ENTRY_NOT_FOUND_MESSAGE =
  'Tidsregistrering blev ikke fundet';

function getPayrollReferenceDate(
  entry: any,
  clockIn: Date,
) {
  return entry.shift?.startTime ?? clockIn;
}

function isSameInstant(left: Date, right: Date) {
  return left.getTime() === right.getTime();
}

function isSamePayrollPeriod(
  left: PayrollPeriodMutationDateLock,
  right: PayrollPeriodMutationDateLock,
) {
  return (
    left.periodDates.start.getTime() ===
    right.periodDates.start.getTime()
  );
}

export async function lockTimeEntryUpdatePayrollPeriods(
  tx: Prisma.TransactionClient,
  params: {
    initialEntry: any;
    nextClockIn: Date;
  },
) {
  const initialSourceReference =
    getPayrollReferenceDate(
      params.initialEntry,
      params.initialEntry.clockIn,
    );
  const initialDestinationReference =
    getPayrollReferenceDate(
      params.initialEntry,
      params.nextClockIn,
    );
  const [sourceLock, destinationLock] =
    await acquirePayrollPeriodMutationLocksForDates(
      tx,
      {
        cinemaId: params.initialEntry.cinemaId,
        referenceDates: [
          initialSourceReference,
          initialDestinationReference,
        ],
      },
    );

  const currentEntry =
    await tx.timeEntry.findUnique({
      where: {
        id: params.initialEntry.id,
      },
      include:
        getTimeEntryWithUserCinemaShiftInclude(),
    });

  if (!currentEntry) {
    throw new NotFoundException(
      TIME_ENTRY_NOT_FOUND_MESSAGE,
    );
  }

  const currentSourceReference =
    getPayrollReferenceDate(
      currentEntry,
      currentEntry.clockIn,
    );
  const currentDestinationReference =
    getPayrollReferenceDate(
      currentEntry,
      params.nextClockIn,
    );

  if (
    !isSameInstant(
      currentSourceReference,
      initialSourceReference,
    ) ||
    !isSameInstant(
      currentDestinationReference,
      initialDestinationReference,
    )
  ) {
    throw new ConflictException(
      'Tidsregistreringen blev ændret af en anden bruger. Hent siden igen og prøv på ny.',
    );
  }

  if (
    destinationLock.payrollPeriod?.status ===
    'LOCKED'
  ) {
    throw new BadRequestException(
      'Lønperioden for den nye mødetid er låst. Genåbn lønperioden, før tidsregistreringen flyttes.',
    );
  }

  if (
    currentEntry.status === 'APPROVED' &&
    !isSamePayrollPeriod(
      sourceLock,
      destinationLock,
    )
  ) {
    throw new BadRequestException(
      'Fjern godkendelsen, før tidsregistreringen flyttes til en anden lønperiode.',
    );
  }

  return {
    existingEntry: currentEntry,
    sourceLock,
    destinationLock,
  };
}
