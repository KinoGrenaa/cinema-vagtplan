import type { TimeEntryMinuteStep } from "@/app/hooks/useTimeEntryMinuteStep";

import type { TimeEntry } from "./myTimeTypes";

const plannedComparisonTimeFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      timeZone: "Europe/Copenhagen",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  );

function parseTimestamp(
  value?: string | null,
) {
  if (!value) return null;

  const date = new Date(value);
  const timestamp = date.getTime();

  return Number.isNaN(timestamp)
    ? null
    : timestamp;
}

export function roundPlannedComparisonTimestamp(
  value: string | undefined,
  minuteStep: TimeEntryMinuteStep,
) {
  const timestamp =
    parseTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  const stepMilliseconds =
    minuteStep * 60 * 1000;

  return (
    Math.round(
      timestamp /
        stepMilliseconds,
    ) *
    stepMilliseconds
  );
}

export function formatPlannedComparisonTime(
  value: string | undefined,
  minuteStep: TimeEntryMinuteStep,
) {
  const roundedTimestamp =
    roundPlannedComparisonTimestamp(
      value,
      minuteStep,
    );

  if (roundedTimestamp === null) {
    return "-";
  }

  return plannedComparisonTimeFormatter.format(
    new Date(roundedTimestamp),
  );
}

export function hasPlannedTimeDeviation(
  entry: TimeEntry,
  minuteStep: TimeEntryMinuteStep,
) {
  if (
    !entry.shift?.startTime ||
    !entry.shift?.endTime
  ) {
    return false;
  }

  const plannedClockIn =
    roundPlannedComparisonTimestamp(
      entry.shift.startTime,
      minuteStep,
    );
  const plannedClockOut =
    roundPlannedComparisonTimestamp(
      entry.shift.endTime,
      minuteStep,
    );
  const actualClockIn =
    parseTimestamp(entry.clockIn);

  if (
    plannedClockIn === null ||
    plannedClockOut === null ||
    actualClockIn === null
  ) {
    return false;
  }

  if (actualClockIn !== plannedClockIn) {
    return true;
  }

  if (!entry.clockOut) {
    return false;
  }

  const actualClockOut =
    parseTimestamp(entry.clockOut);

  return (
    actualClockOut !== null &&
    actualClockOut !== plannedClockOut
  );
}
