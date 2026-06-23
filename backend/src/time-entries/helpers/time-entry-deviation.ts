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
};

const DEFAULT_DEVIATION_GRACE_MINUTES = 5;

export function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function formatSignedDuration(minutes: number) {
  const sign = minutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;

  return `${sign}${String(hours).padStart(2, '0')}:${String(
    remainingMinutes,
  ).padStart(2, '0')}`;
}

export function getEntryMinutes(entry: {
  clockIn: Date;
  clockOut?: Date | null;
}) {
  if (!entry.clockOut) {
    return 0;
  }

  return minutesBetween(entry.clockIn, entry.clockOut);
}

export function hasText(value?: string | null) {
  return Boolean(value && value.trim() !== '');
}

export function requiresClockInDeviationNote(deviation: TimeEntryDeviation) {
  return deviation.types.some(
    (type) => type === 'EARLY_CLOCK_IN' || type === 'LATE_CLOCK_IN',
  );
}

export function requiresClockOutDeviationNote(deviation: TimeEntryDeviation) {
  return deviation.types.some(
    (type) => type === 'EARLY_CLOCK_OUT' || type === 'LATE_CLOCK_OUT',
  );
}

export function requiresGeneralDeviationNote(deviation: TimeEntryDeviation) {
  return deviation.types.some(
    (type) => type === 'TIME_DIFFERENCE' || type === 'MANUAL_WITHOUT_SHIFT',
  );
}

export function analyzeTimeEntryDeviation(
  entry: any,
  settings?: TimeEntryDeviationSettings | null,
): TimeEntryDeviation {
  const messages: string[] = [];
  const types: TimeEntryDeviationType[] = [];

  const shift = entry.shift;

  const clockInTolerance =
    settings?.clockInDeviationToleranceMinutes ??
    entry.cinema?.clockInDeviationToleranceMinutes ??
    DEFAULT_DEVIATION_GRACE_MINUTES;

  const clockOutTolerance =
    settings?.clockOutDeviationToleranceMinutes ??
    entry.cinema?.clockOutDeviationToleranceMinutes ??
    DEFAULT_DEVIATION_GRACE_MINUTES;

  const requireNoteForClockInDeviation =
    settings?.requireNoteForClockInDeviation ??
    entry.cinema?.requireNoteForClockInDeviation ??
    true;

  const requireNoteForClockOutDeviation =
    settings?.requireNoteForClockOutDeviation ??
    entry.cinema?.requireNoteForClockOutDeviation ??
    true;

  const requireNoteForManualEntry =
    settings?.requireNoteForManualEntry ??
    entry.cinema?.requireNoteForManualEntry ??
    true;

  if (!entry.clockOut) {
    return {
      hasDeviation: true,
      requiresNote: false,
      types: ['OPEN_ENTRY'],
      plannedMinutes: shift
        ? minutesBetween(shift.startTime, shift.endTime)
        : null,
      registeredMinutes: null,
      differenceMinutes: null,
      clockInDeviationMinutes: shift
        ? minutesBetween(shift.startTime, entry.clockIn)
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

  const plannedMinutes = minutesBetween(shift.startTime, shift.endTime);
  const registeredMinutes = minutesBetween(entry.clockIn, entry.clockOut);
  const differenceMinutes = registeredMinutes - plannedMinutes;
  const clockInDeviationMinutes = minutesBetween(shift.startTime, entry.clockIn);
  const clockOutDeviationMinutes = minutesBetween(shift.endTime, entry.clockOut);

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
  };
}
