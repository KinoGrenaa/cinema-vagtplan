import { roundDateToTimeEntryMinuteStep } from '../../time-entries/helpers/time-entry-planned-rounding';

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

function formatDeviationMinutes(minutes: number): string {
  const absoluteMinutes = Math.abs(minutes);

  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} minutter`;
  }

  if (remainingMinutes === 0) {
    return `${hours} timer`;
  }

  return `${hours} timer ${remainingMinutes} minutter`;
}

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function analyzePayrollTimeEntryDeviation(
  entry: any,
  deviationGraceMinutes = 5,
): TimeEntryDeviation {
  const messages: string[] = [];
  const types: TimeEntryDeviationType[] = [];
  const shift = entry.shift;
  const timeEntryMinuteStep =
    entry.cinema?.timeEntryMinuteStep;

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
      requiresNote: true,
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

  if (clockInDeviationMinutes > deviationGraceMinutes) {
    types.push('LATE_CLOCK_IN');
    messages.push(
      `Mødt ${formatDeviationMinutes(clockInDeviationMinutes)} for sent`,
    );
  }

  if (clockInDeviationMinutes < -deviationGraceMinutes) {
    types.push('EARLY_CLOCK_IN');
    messages.push(
      `Mødt ${formatDeviationMinutes(clockInDeviationMinutes)} før planlagt`,
    );
  }

  if (clockOutDeviationMinutes < -deviationGraceMinutes) {
    types.push('EARLY_CLOCK_OUT');
    messages.push(
      `Gået ${formatDeviationMinutes(clockOutDeviationMinutes)} efter planlagt`,
    );
  }

  if (clockOutDeviationMinutes > deviationGraceMinutes) {
    types.push('LATE_CLOCK_OUT');
    messages.push(
      `Gået ${formatDeviationMinutes(clockOutDeviationMinutes)} efter planlagt`,
    );
  }

  if (types.length === 0 && Math.abs(differenceMinutes) > deviationGraceMinutes) {
    types.push('TIME_DIFFERENCE');
    messages.push(
      `Registreret tid afviger med ${formatDeviationMinutes(differenceMinutes)} fra vagtplanen`,
    );
  }

  if (types.length === 0) {
    types.push('NONE');
    messages.push('Ingen væsentlig afvigelse');
  }

  const hasDeviation = types.some((type) => type !== 'NONE');

  return {
    hasDeviation,
    requiresNote: hasDeviation,
    types,
    plannedMinutes,
    registeredMinutes,
    differenceMinutes,
    clockInDeviationMinutes,
    clockOutDeviationMinutes,
    messages,
  };
}
