import { resolveTimeEntryDeviationSettings } from './time-entry-deviation-settings';
import type {
  TimeEntryDeviation,
  TimeEntryDeviationSettings,
  TimeEntryDeviationType,
} from './time-entry-deviation-types';
import { minutesBetween } from './time-entry-deviation-utils';
import { roundDateToTimeEntryMinuteStep } from './time-entry-planned-rounding';

export type {
  TimeEntryDeviation,
  TimeEntryDeviationSettings,
  TimeEntryDeviationType,
} from './time-entry-deviation-types';

export {
  formatSignedDuration,
  getEntryMinutes,
  hasText,
  minutesBetween,
  requiresClockInDeviationNote,
  requiresClockOutDeviationNote,
  requiresGeneralDeviationNote,
} from './time-entry-deviation-utils';

export function analyzeTimeEntryDeviation(
  entry: any,
  settings?: TimeEntryDeviationSettings | null,
): TimeEntryDeviation {
  const messages: string[] = [];
  const types: TimeEntryDeviationType[] = [];

  const shift = entry.shift;

  const {
    clockInTolerance,
    clockOutTolerance,
    requireNoteForClockInDeviation,
    requireNoteForClockOutDeviation,
    requireNoteForManualEntry,
    timeEntryMinuteStep,
  } = resolveTimeEntryDeviationSettings(entry, settings);

  const plannedStartTime = shift
    ? roundDateToTimeEntryMinuteStep(
        shift.startTime,
        timeEntryMinuteStep,
      )
    : null;

  const plannedEndTime = shift
    ? roundDateToTimeEntryMinuteStep(
        shift.endTime,
        timeEntryMinuteStep,
      )
    : null;

  if (!entry.clockOut) {
    return {
      hasDeviation: true,
      requiresNote: false,
      types: ['OPEN_ENTRY'],
      plannedMinutes:
        plannedStartTime &&
        plannedEndTime
          ? minutesBetween(
              plannedStartTime,
              plannedEndTime,
            )
          : null,
      registeredMinutes: null,
      differenceMinutes: null,
      clockInDeviationMinutes:
        plannedStartTime
          ? minutesBetween(
              plannedStartTime,
              entry.clockIn,
            )
          : null,
      clockOutDeviationMinutes: null,
      messages: ['Tidsregistreringen er stadig åben'],
    };
  }

  if (!shift) {
    return {
      hasDeviation: true,
      requiresNote: requireNoteForManualEntry,
      types: ['MANUAL_WITHOUT_SHIFT'],
      plannedMinutes: null,
      registeredMinutes: minutesBetween(entry.clockIn, entry.clockOut),
      differenceMinutes: null,
      clockInDeviationMinutes: null,
      clockOutDeviationMinutes: null,
      messages: ['Tidsregistreringen er ikke tilknyttet en planlagt vagt'],
    };
  }

  const plannedMinutes =
    minutesBetween(
      plannedStartTime!,
      plannedEndTime!,
    );
  const registeredMinutes =
    minutesBetween(
      entry.clockIn,
      entry.clockOut,
    );
  const differenceMinutes =
    registeredMinutes -
    plannedMinutes;
  const clockInDeviationMinutes =
    minutesBetween(
      plannedStartTime!,
      entry.clockIn,
    );
  const clockOutDeviationMinutes =
    minutesBetween(
      plannedEndTime!,
      entry.clockOut,
    );

  if (clockInDeviationMinutes > clockInTolerance) {
    types.push('LATE_CLOCK_IN');
    messages.push(`Mødt ${clockInDeviationMinutes} minutter for sent`);
  }

  if (clockInDeviationMinutes < -clockInTolerance) {
    types.push('EARLY_CLOCK_IN');
    messages.push(
      `Mødt ${Math.abs(clockInDeviationMinutes)} minutter før planlagt`,
    );
  }

  if (clockOutDeviationMinutes < -clockOutTolerance) {
    types.push('EARLY_CLOCK_OUT');
    messages.push(
      `Gået ${Math.abs(clockOutDeviationMinutes)} minutter før planlagt`,
    );
  }

  if (clockOutDeviationMinutes > clockOutTolerance) {
    types.push('LATE_CLOCK_OUT');
    messages.push(`Gået ${clockOutDeviationMinutes} minutter efter planlagt`);
  }

  if (
    types.length === 0 &&
    Math.abs(differenceMinutes) > Math.max(clockInTolerance, clockOutTolerance)
  ) {
    types.push('TIME_DIFFERENCE');
    messages.push(
      `Registreret tid afviger med ${differenceMinutes} minutter fra vagtplanen`,
    );
  }

  if (types.length === 0) {
    types.push('NONE');
    messages.push('Ingen væsentlig afvigelse');
  }

  const hasDeviation = types.some((type) => type !== 'NONE');

  const requiresNote =
    (types.some(
      (type) => type === 'EARLY_CLOCK_IN' || type === 'LATE_CLOCK_IN',
    ) &&
      requireNoteForClockInDeviation) ||
    (types.some(
      (type) => type === 'EARLY_CLOCK_OUT' || type === 'LATE_CLOCK_OUT',
    ) &&
      requireNoteForClockOutDeviation) ||
    (types.includes('TIME_DIFFERENCE') &&
      (requireNoteForClockInDeviation || requireNoteForClockOutDeviation));

  return {
    hasDeviation,
    requiresNote,
    types,
    plannedMinutes,
    registeredMinutes,
    differenceMinutes,
    clockInDeviationMinutes,
    clockOutDeviationMinutes,
    messages,
  };
}

export function withTimeEntryDeviation(entry: any) {
  return {
    ...entry,
    deviation: analyzeTimeEntryDeviation(entry, entry.cinema),
  };
}

export function getCinemaDeviationSelect() {
  return {
    clockInDeviationToleranceMinutes: true,
    clockOutDeviationToleranceMinutes: true,
    requireNoteForClockInDeviation: true,
    requireNoteForClockOutDeviation: true,
    requireNoteForManualEntry: true,
    timeEntryMinuteStep: true,
  };
}
