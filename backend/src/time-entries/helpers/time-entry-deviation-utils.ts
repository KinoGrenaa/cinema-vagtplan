import type { TimeEntryDeviation } from './time-entry-deviation-types';

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
