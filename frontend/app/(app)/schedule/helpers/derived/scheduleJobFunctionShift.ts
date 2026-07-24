import {
  localDateTimeToISOString,
} from "@/app/utils/dateTime";

import type {
  ScheduleJobFunction,
} from "../../hooks/data/useScheduleJobFunctions";

const DAY_MINUTES = 24 * 60;
const DEFAULT_DURATION_MINUTES =
  8 * 60;
const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES =
  DAY_MINUTES;
const SNAP_MINUTES = 15;

function snapMinutes(
  value: number,
) {
  return Math.round(
    value / SNAP_MINUTES,
  ) * SNAP_MINUTES;
}

function normalizeDuration(
  startMinute:
    | number
    | null
    | undefined,
  endMinute:
    | number
    | null
    | undefined,
) {
  if (
    typeof startMinute !==
      "number" ||
    typeof endMinute !==
      "number"
  ) {
    return null;
  }

  let duration =
    endMinute - startMinute;

  if (duration <= 0) {
    duration += DAY_MINUTES;
  }

  return Math.max(
    MIN_DURATION_MINUTES,
    Math.min(
      MAX_DURATION_MINUTES,
      snapMinutes(duration),
    ),
  );
}

function formatLocalDateTime(
  value: Date,
) {
  const year =
    value.getFullYear();
  const month =
    String(
      value.getMonth() + 1,
    ).padStart(2, "0");
  const day =
    String(
      value.getDate(),
    ).padStart(2, "0");
  const hour =
    String(
      value.getHours(),
    ).padStart(2, "0");
  const minute =
    String(
      value.getMinutes(),
    ).padStart(2, "0");

  return (
    `${year}-${month}-${day}` +
    `T${hour}:${minute}`
  );
}

export function getJobFunctionShiftDurationMinutes(
  jobFunction:
    ScheduleJobFunction,
) {
  const timingRule =
    jobFunction.timingRule;

  const timingDuration =
    normalizeDuration(
      timingRule
        ?.fallbackStartMinute ??
        timingRule
          ?.startFixedMinute,
      timingRule
        ?.fallbackEndMinute ??
        timingRule
          ?.endFixedMinute,
    );

  if (timingDuration) {
    return timingDuration;
  }

  const dayPeriodDuration =
    normalizeDuration(
      jobFunction.dayPeriod
        ?.startMinute,
      jobFunction.dayPeriod
        ?.endMinute,
    );

  return (
    dayPeriodDuration ??
    DEFAULT_DURATION_MINUTES
  );
}

export function formatJobFunctionShiftDuration(
  durationMinutes: number,
) {
  const hours =
    Math.floor(
      durationMinutes / 60,
    );
  const minutes =
    durationMinutes % 60;

  if (hours === 0) {
    return `${minutes} min.`;
  }

  if (minutes === 0) {
    return hours === 1
      ? "1 time"
      : `${hours} timer`;
  }

  return (
    `${hours} t. ` +
    `${minutes} min.`
  );
}

export function buildUnassignedJobFunctionShift(
  params: {
    selectedDate: string;
    startMinutes: number;
    workTypeId: number;
    jobFunction:
      ScheduleJobFunction;
  },
) {
  const durationMinutes =
    getJobFunctionShiftDurationMinutes(
      params.jobFunction,
    );
  const start =
    new Date(
      `${params.selectedDate}` +
        "T00:00:00",
    );

  start.setMinutes(
    snapMinutes(
      params.startMinutes,
    ),
  );

  const end =
    new Date(start);

  end.setMinutes(
    end.getMinutes() +
      durationMinutes,
  );

  return {
    startTime:
      localDateTimeToISOString(
        formatLocalDateTime(start),
      ),
    endTime:
      localDateTimeToISOString(
        formatLocalDateTime(end),
      ),
    note: "",
    userId: null,
    workTypeId:
      params.workTypeId,
  };
}
