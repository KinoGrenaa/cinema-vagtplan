import { BadRequestException } from '@nestjs/common';
import {
  hasText,
  requiresClockInDeviationNote,
  requiresClockOutDeviationNote,
  requiresGeneralDeviationNote,
  type TimeEntryDeviation,
} from './time-entry-deviation';

export function ensureManualEntryDeviationNotes(data: {
  deviation: TimeEntryDeviation;
  clockInNote?: string | null;
  clockOutNote?: string | null;
}) {
  if (
    data.deviation.requiresNote &&
    requiresClockInDeviationNote(data.deviation) &&
    !hasText(data.clockInNote)
  ) {
    throw new BadRequestException(
      'Du skal skrive en mødetidsnote, når mødetiden afviger fra vagtplanen',
    );
  }

  if (
    data.deviation.requiresNote &&
    requiresClockOutDeviationNote(data.deviation) &&
    !hasText(data.clockOutNote)
  ) {
    throw new BadRequestException(
      'Du skal skrive en fyraftensnote, når fyraften afviger fra vagtplanen',
    );
  }
}

export function ensureApprovalDeviationNotes(data: {
  deviation: TimeEntryDeviation;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  note?: string | null;
}) {
  if (
    data.deviation.requiresNote &&
    !hasText(data.clockInNote) &&
    !hasText(data.clockOutNote) &&
    !hasText(data.note)
  ) {
    throw new BadRequestException(
      'Tidsregistreringen har afvigelser og kræver en medarbejder-note før godkendelse',
    );
  }
}

export function ensureOwnTimeEntryDeviationNotes(data: {
  deviation: TimeEntryDeviation;
  clockInNote?: string | null;
  clockOutNote?: string | null;
}) {
  if (
    data.deviation.requiresNote &&
    requiresClockInDeviationNote(data.deviation) &&
    !hasText(data.clockInNote)
  ) {
    throw new BadRequestException(
      'Du skal skrive en mødetidsnote, når mødetiden afviger fra vagtplanen',
    );
  }

  if (
    data.deviation.requiresNote &&
    requiresClockOutDeviationNote(data.deviation) &&
    !hasText(data.clockOutNote)
  ) {
    throw new BadRequestException(
      'Du skal skrive en fyraftensnote, når fyraften afviger fra vagtplanen',
    );
  }

  if (
    data.deviation.requiresNote &&
    requiresGeneralDeviationNote(data.deviation) &&
    !hasText(data.clockInNote) &&
    !hasText(data.clockOutNote)
  ) {
    throw new BadRequestException(
      'Du skal skrive en note, når tiderne afviger fra vagtplanen',
    );
  }
}

export function ensureAdminTimeEntryDeviationNotes(data: {
  deviation: TimeEntryDeviation;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
}) {
  if (
    data.deviation.requiresNote &&
    requiresClockInDeviationNote(data.deviation) &&
    !hasText(data.clockInNote) &&
    !hasText(data.adminNote)
  ) {
    throw new BadRequestException(
      'Mødetidsnote eller admin-note er påkrævet, når mødetiden afviger fra vagtplanen',
    );
  }

  if (
    data.deviation.requiresNote &&
    requiresClockOutDeviationNote(data.deviation) &&
    !hasText(data.clockOutNote) &&
    !hasText(data.adminNote)
  ) {
    throw new BadRequestException(
      'Fyraftensnote eller admin-note er påkrævet, når fyraften afviger fra vagtplanen',
    );
  }
}
