import { ConflictException } from '@nestjs/common';
import {
  Prisma,
  TimeEntryStatus,
} from '@prisma/client';

export const SHIFT_TIME_ENTRY_LOCK_MESSAGE =
  'Vagten kan ikke ændres, fordi der findes en tidsregistrering.';

type ShiftTimeEntryLockDb = Pick<
  Prisma.TransactionClient,
  'timeEntry'
>;

export async function assertShiftHasNoActiveTimeEntry(
  db: ShiftTimeEntryLockDb,
  params: {
    cinemaId: number;
    shiftId: number;
    message?: string;
  },
) {
  const existingEntry =
    await db.timeEntry.findFirst({
      where: {
        cinemaId: params.cinemaId,
        shiftId: params.shiftId,
        status: {
          not: TimeEntryStatus.VOIDED,
        },
      },
      select: {
        id: true,
      },
    });

  if (existingEntry) {
    throw new ConflictException(
      params.message ??
        SHIFT_TIME_ENTRY_LOCK_MESSAGE,
    );
  }
}
