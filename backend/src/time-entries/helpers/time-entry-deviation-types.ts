export type TimeEntryDeviationType =
  | 'NONE'
  | 'OPEN_ENTRY'
  | 'MANUAL_WITHOUT_SHIFT'
  | 'EARLY_CLOCK_IN'
  | 'LATE_CLOCK_IN'
  | 'EARLY_CLOCK_OUT'
  | 'LATE_CLOCK_OUT'
  | 'TIME_DIFFERENCE';

export type TimeEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;
  types: TimeEntryDeviationType[];
  plannedMinutes: number | null;
  registeredMinutes: number | null;
  differenceMinutes: number | null;
  clockInDeviationMinutes: number | null;
  clockOutDeviationMinutes: number | null;
  messages: string[];
};

export type TimeEntryDeviationSettings = {
  clockInDeviationToleranceMinutes?: number | null;
  clockOutDeviationToleranceMinutes?: number | null;
  requireNoteForClockInDeviation?: boolean | null;
  requireNoteForClockOutDeviation?: boolean | null;
  requireNoteForManualEntry?: boolean | null;
  timeEntryMinuteStep?: number | null;
};
