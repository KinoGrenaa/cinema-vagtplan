import { BadRequestException } from '@nestjs/common';

import { analyzeTimeEntryDeviation } from './time-entry-deviation';
import {
  ensureAdminTimeEntryDeviationNotes,
  ensureOwnTimeEntryDeviationNotes,
} from './time-entry-deviation-notes';
import {
  getAdminTimeEntryUpdateChanges,
  getOwnTimeEntryUpdateChanges,
} from './time-entry-update-changes';
import {
  ensureClockOutAfterClockIn,
  parseNullableTimeEntryDate,
  parseRequiredTimeEntryDate,
} from './time-entry-date-helpers';
import {
  buildCombinedClockOutNote,
  ensureRequiredText,
  getTrimmedOptionalNote,
} from './time-entry-note-helpers';

type OwnTimeEntryUpdateData = {
  clockIn: string;
  clockOut?: string | null;
  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
};

type AdminTimeEntryUpdateData = {
  clockIn?: string;
  clockOut?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
};

export function ensureOwnTimeEntryCanBeUpdated(user: any, existingEntry: any) {
  if (existingEntry.userId !== user.sub) {
    throw new BadRequestException(
      'Du kan kun rette dine egne tidsregistreringer',
    );
  }

  if (existingEntry.status === 'APPROVED') {
    throw new BadRequestException(
      'Denne tidsregistrering er allerede godkendt og kan ikke ændres',
    );
  }

  if (existingEntry.status === 'VOIDED') {
    throw new BadRequestException(
      'En annulleret tidsregistrering kan ikke ændres',
    );
  }
}

export function getOwnTimeEntryUpdateContext(
  existingEntry: any,
  data: OwnTimeEntryUpdateData,
) {
  const newClockIn = parseRequiredTimeEntryDate(
    data.clockIn,
    'Ugyldig mødetid',
  );
  const newClockOut = parseNullableTimeEntryDate(
    data.clockOut,
    'Ugyldig fyraften',
  );
  const newClockInNote =
    data.clockInNote === undefined
      ? existingEntry.clockInNote ?? null
      : getTrimmedOptionalNote(data.clockInNote);
  const newClockOutNote =
    data.clockOutNote === undefined
      ? existingEntry.clockOutNote ?? null
      : getTrimmedOptionalNote(data.clockOutNote);
  const newNote =
    data.note !== undefined
      ? getTrimmedOptionalNote(data.note)
      : existingEntry.shift
        ? buildCombinedClockOutNote(
            newClockInNote,
            newClockOutNote,
          ) || null
        : existingEntry.note ?? null;

  ensureClockOutAfterClockIn(newClockIn, newClockOut);

  const deviation = analyzeTimeEntryDeviation(
    {
      ...existingEntry,
      clockIn: newClockIn,
      clockOut: newClockOut,
    },
    existingEntry.cinema,
  );

  ensureOwnTimeEntryDeviationNotes({
    deviation,
    note: newNote,
    clockInNote: newClockInNote,
    clockOutNote: newClockOutNote,
  });

  const changes = getOwnTimeEntryUpdateChanges({
    existingEntry,
    newClockIn,
    newClockOut,
    newNote,
    newClockInNote,
    newClockOutNote,
  });

  if (changes.length === 0) {
    throw new BadRequestException('Ingen ændringer registreret');
  }

  return {
    newClockIn,
    newClockOut,
    newNote,
    newClockInNote,
    newClockOutNote,
    changes,
  };
}

export function getAdminTimeEntryUpdateContext(
  existingEntry: any,
  data: AdminTimeEntryUpdateData,
) {
  ensureRequiredText(
    data.adminNote,
    'Admin-note er påkrævet ved rettelse af timer',
  );

  const nextClockIn = data.clockIn
    ? parseRequiredTimeEntryDate(data.clockIn, 'Ugyldig mødetid')
    : existingEntry.clockIn;

  const nextClockOut =
    data.clockOut === undefined
      ? existingEntry.clockOut
      : parseNullableTimeEntryDate(data.clockOut, 'Ugyldig fyraften');

  ensureClockOutAfterClockIn(nextClockIn, nextClockOut);

  const nextClockInNote =
    data.clockInNote === undefined
      ? existingEntry.clockInNote
      : data.clockInNote;
  const nextClockOutNote =
    data.clockOutNote === undefined
      ? existingEntry.clockOutNote
      : data.clockOutNote;

  const deviation = analyzeTimeEntryDeviation(
    {
      ...existingEntry,
      clockIn: nextClockIn,
      clockOut: nextClockOut,
    },
    existingEntry.cinema,
  );

  ensureAdminTimeEntryDeviationNotes({
    deviation,
    clockInNote: nextClockInNote,
    clockOutNote: nextClockOutNote,
    adminNote: data.adminNote,
  });

  const changes = getAdminTimeEntryUpdateChanges({
    existingEntry,
    nextClockIn,
    nextClockOut,
    data,
  });

  if (changes.length === 0) {
    throw new BadRequestException('Ingen ændringer registreret');
  }

  return {
    nextClockIn,
    nextClockOut,
    nextClockInNote,
    nextClockOutNote,
    changes,
  };
}
