import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ensureTimeEntryEditable,
  ensureUserCanAccessTimeEntry,
} from './time-entry-access';
import { getTimeEntryWithUserCinemaShiftInclude } from './time-entry-includes';
import { getRequiredTrimmedNote } from './time-entry-note-helpers';

export function getChangedByUserId(user: any) {
  return user?.sub ?? null;
}

export function getRequiredStatusActionNote(
  note: string | undefined,
  message: string,
) {
  return getRequiredTrimmedNote(note, message);
}

export async function findEditableStatusActionEntry({
  prisma,
  id,
  user,
  selectedCinemaId,
}: {
  prisma: any;
  id: number;
  user: any;
  selectedCinemaId?: number | null;
}) {
  const existingEntry =
    await prisma.timeEntry.findUnique({
      where: {
        id,
      },
      include:
        getTimeEntryWithUserCinemaShiftInclude(),
    });

  if (!existingEntry) {
    throw new NotFoundException(
      'Tidsregistrering blev ikke fundet',
    );
  }

  ensureUserCanAccessTimeEntry(
    user,
    existingEntry,
    selectedCinemaId,
  );
  ensureTimeEntryEditable(existingEntry, user);

  return existingEntry;
}

export function ensureTimeEntryCanBeUnapproved(
  existingEntry: any,
) {
  if (existingEntry.status === 'VOIDED') {
    throw new BadRequestException(
      'En annulleret tidsregistrering kan ikke genåbnes',
    );
  }

  if (existingEntry.status !== 'APPROVED') {
    throw new BadRequestException(
      'Kun en godkendt tidsregistrering kan få fjernet godkendelsen',
    );
  }
}

export {
  recordApproveTimeEntryStatusChange,
  recordRejectTimeEntryStatusChange,
  recordUnapproveTimeEntryStatusChange,
  recordVoidTimeEntryStatusChange,
} from './time-entry-status-action-records';
