import type { TimeEntryDeviationSettings } from './time-entry-deviation-types';
import { resolveTimeEntryMinuteStep } from './time-entry-planned-rounding';

const DEFAULT_DEVIATION_GRACE_MINUTES = 5;

export function resolveTimeEntryDeviationSettings(
  entry: any,
  settings?: TimeEntryDeviationSettings | null,
) {
  return {
    clockInTolerance:
      settings?.clockInDeviationToleranceMinutes ??
      entry.cinema?.clockInDeviationToleranceMinutes ??
      DEFAULT_DEVIATION_GRACE_MINUTES,

    clockOutTolerance:
      settings?.clockOutDeviationToleranceMinutes ??
      entry.cinema?.clockOutDeviationToleranceMinutes ??
      DEFAULT_DEVIATION_GRACE_MINUTES,

    requireNoteForClockInDeviation:
      settings?.requireNoteForClockInDeviation ??
      entry.cinema?.requireNoteForClockInDeviation ??
      true,

    requireNoteForClockOutDeviation:
      settings?.requireNoteForClockOutDeviation ??
      entry.cinema?.requireNoteForClockOutDeviation ??
      true,

    requireNoteForManualEntry:
      settings?.requireNoteForManualEntry ??
      entry.cinema?.requireNoteForManualEntry ??
      true,

    timeEntryMinuteStep:
      resolveTimeEntryMinuteStep(
        settings?.timeEntryMinuteStep ??
          entry.cinema?.timeEntryMinuteStep,
      ),
  };
}
