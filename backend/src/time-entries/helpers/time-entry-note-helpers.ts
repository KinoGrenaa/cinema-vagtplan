import { BadRequestException } from '@nestjs/common';

export type ManualEntryNotesInput = {
  note?: string;
  clockInNote?: string;
  clockOutNote?: string;
};

export function getManualEntryNotes(data: ManualEntryNotesInput) {
  return {
    clockInNote: data.clockInNote ?? data.note ?? null,
    clockOutNote: data.clockOutNote ?? data.note ?? null,
  };
}

export function getTrimmedOptionalNote(value?: string | null) {
  return value?.trim() || null;
}

export function ensureRequiredText(
  value: string | null | undefined,
  message: string,
) {
  if (!value?.trim()) {
    throw new BadRequestException(message);
  }
}

export function getRequiredTrimmedNote(
  value: string | null | undefined,
  message: string,
) {
  const note = value?.trim();

  if (!note) {
    throw new BadRequestException(message);
  }

  return note;
}

export function buildCombinedClockOutNote(
  existingNote: string | null | undefined,
  clockOutNote: string | null | undefined,
) {
  return [existingNote, clockOutNote ? `Fyraften: ${clockOutNote}` : null]
    .filter((note): note is string => Boolean(note))
    .join('\n\n');
}
