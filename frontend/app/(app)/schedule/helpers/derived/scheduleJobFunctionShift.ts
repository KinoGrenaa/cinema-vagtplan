import {
  localDateTimeToISOString,
} from "@/app/utils/dateTime";

import type {
  ScheduleJobFunction,
} from "../../hooks/data/useScheduleJobFunctions";
import type {
  ScheduleJobFunctionTimingPreview,
} from "../../hooks/data/useScheduleJobFunctionTimingPreview";

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

  return DEFAULT_DURATION_MINUTES;
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
    jobFunctionId: number;
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
    jobFunctionId:
      params.jobFunctionId,
  };
}


function formatPreviewMinute(
  value: number,
) {
  const normalized =
    ((value % DAY_MINUTES) +
      DAY_MINUTES) %
    DAY_MINUTES;
  const hour =
    Math.floor(
      normalized / 60,
    );
  const minute =
    normalized % 60;

  return `${String(hour).padStart(
    2,
    "0",
  )}:${String(minute).padStart(
    2,
    "0",
  )}`;
}

export function formatJobFunctionTimingPreviewRange(
  preview:
    ScheduleJobFunctionTimingPreview,
) {
  const startDay =
    Math.floor(
      preview.startMinute /
        DAY_MINUTES,
    );
  const endDay =
    Math.floor(
      preview.endMinute /
        DAY_MINUTES,
    );
  const range =
    `${formatPreviewMinute(
      preview.startMinute,
    )}–${formatPreviewMinute(
      preview.endMinute,
    )}`;

  if (
    startDay === 0 &&
    endDay === 0
  ) {
    return range;
  }

  if (
    startDay === 0 &&
    endDay === 1
  ) {
    return `${range} næste dag`;
  }

  if (
    startDay === 1 &&
    endDay === 1
  ) {
    return `${range} (næste dag)`;
  }

  return (
    `${range} ` +
    `(+${endDay} dage)`
  );
}

export function buildUnassignedJobFunctionShiftFromTimingPreview(
  params: {
    preview:
      ScheduleJobFunctionTimingPreview;
    jobFunctionId: number;
  },
) {
  return {
    startTime:
      params.preview.startTime,
    endTime:
      params.preview.endTime,
    note: "",
    userId: null,
    jobFunctionId:
      params.jobFunctionId,
  };
}

export function getJobFunctionTimingPreviewOverlap(
  preview:
    ScheduleJobFunctionTimingPreview,
  shifts: Array<{
    startTime: string;
    endTime: string;
    jobFunctionId: number;
  }>,
  jobFunctionId: number,
) {
  const previewStart =
    new Date(
      preview.startTime,
    ).getTime();
  const previewEnd =
    new Date(
      preview.endTime,
    ).getTime();

  if (
    Number.isNaN(
      previewStart,
    ) ||
    Number.isNaN(
      previewEnd,
    )
  ) {
    return null;
  }

  const overlapping =
    shifts.filter((shift) => {
      const shiftStart =
        new Date(
          shift.startTime,
        ).getTime();
      const shiftEnd =
        new Date(
          shift.endTime,
        ).getTime();

      return (
        !Number.isNaN(
          shiftStart,
        ) &&
        !Number.isNaN(
          shiftEnd,
        ) &&
        previewStart < shiftEnd &&
        previewEnd > shiftStart
      );
    });
  const sameJobFunctionCount =
    overlapping.filter(
      (shift) =>
        shift.jobFunctionId ===
        jobFunctionId,
    ).length;

  if (
    sameJobFunctionCount > 0
  ) {
    return {
      level: "error" as const,
      message:
        sameJobFunctionCount === 1
          ? "Overlapper 1 eksisterende vagt med samme jobfunktion"
          : `Overlapper ${sameJobFunctionCount} eksisterende vagter med samme jobfunktion`,
    };
  }

  if (
    overlapping.length > 0
  ) {
    return {
      level: "warning" as const,
      message:
        overlapping.length === 1
          ? "Overlapper 1 eksisterende vagt"
          : `Overlapper ${overlapping.length} eksisterende vagter`,
    };
  }

  return {
    level: "ok" as const,
    message:
      "Ingen overlap med eksisterende vagter",
  };
}
