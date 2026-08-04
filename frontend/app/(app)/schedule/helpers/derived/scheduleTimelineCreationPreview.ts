type PreviewShift = {
  startTime: string;
  endTime: string;
  jobFunctionId: number;
};

export type ScheduleTimelineCreationPreview = {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  leftPercent: number;
  widthPercent: number;
  overlapCount: number;
  sameJobFunctionOverlapCount: number;
  crossesMidnight: boolean;
  conflictLevel:
    | "none"
    | "overlap"
    | "same-work-type";
};

const DAY_MINUTES = 24 * 60;
const MIN_PREVIEW_MINUTES = 15;

function selectedDateStart(
  selectedDate: string,
) {
  return new Date(
    `${selectedDate}T00:00:00`,
  );
}

function selectedDateEnd(
  selectedDate: string,
) {
  const end =
    selectedDateStart(
      selectedDate,
    );

  end.setDate(
    end.getDate() + 1,
  );

  return end;
}

function periodsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return (
    firstStart < secondEnd &&
    firstEnd > secondStart
  );
}

export function getScheduleTimelineCreationPreview(
  params: {
    selectedDate: string;
    startMinutes: number;
    durationMinutes:
      | number
      | null
      | undefined;
    jobFunctionId:
      | number
      | null
      | undefined;
    shifts: PreviewShift[];
  },
): ScheduleTimelineCreationPreview {
  const durationMinutes =
    Math.max(
      MIN_PREVIEW_MINUTES,
      params.durationMinutes ??
        MIN_PREVIEW_MINUTES,
    );
  const startMinutes =
    Math.max(
      0,
      Math.min(
        DAY_MINUTES -
          MIN_PREVIEW_MINUTES,
        params.startMinutes,
      ),
    );
  const previewStart =
    selectedDateStart(
      params.selectedDate,
    );

  previewStart.setMinutes(
    startMinutes,
  );

  const previewEnd =
    new Date(previewStart);

  previewEnd.setMinutes(
    previewEnd.getMinutes() +
      durationMinutes,
  );

  const dayEnd =
    selectedDateEnd(
      params.selectedDate,
    );
  const visibleEnd =
    previewEnd < dayEnd
      ? previewEnd
      : dayEnd;
  const visibleMinutes =
    Math.max(
      MIN_PREVIEW_MINUTES,
      Math.round(
        (
          visibleEnd.getTime() -
          previewStart.getTime()
        ) / 60000,
      ),
    );

  const overlappingShifts =
    params.shifts.filter(
      (shift) =>
        periodsOverlap(
          previewStart,
          previewEnd,
          new Date(
            shift.startTime,
          ),
          new Date(
            shift.endTime,
          ),
        ),
    );
  const sameJobFunctionOverlapCount =
    params.jobFunctionId
      ? overlappingShifts.filter(
          (shift) =>
            shift.jobFunctionId ===
            params.jobFunctionId,
        ).length
      : 0;

  return {
    startMinutes,
    endMinutes:
      startMinutes +
      durationMinutes,
    durationMinutes,
    leftPercent:
      (
        startMinutes /
        DAY_MINUTES
      ) * 100,
    widthPercent:
      (
        visibleMinutes /
        DAY_MINUTES
      ) * 100,
    overlapCount:
      overlappingShifts.length,
    sameJobFunctionOverlapCount,
    crossesMidnight:
      previewEnd > dayEnd,
    conflictLevel:
      sameJobFunctionOverlapCount >
      0
        ? "same-work-type"
        : overlappingShifts.length >
            0
          ? "overlap"
          : "none",
  };
}

export function getScheduleTimelinePreviewStatus(
  preview:
    ScheduleTimelineCreationPreview,
) {
  if (
    preview.sameJobFunctionOverlapCount >
    0
  ) {
    return (
      preview.sameJobFunctionOverlapCount ===
      1
        ? "Overlapper 1 vagt med samme jobfunktion"
        : `Overlapper ${preview.sameJobFunctionOverlapCount} vagter med samme jobfunktion`
    );
  }

  if (preview.overlapCount > 0) {
    return (
      preview.overlapCount === 1
        ? "Overlapper 1 eksisterende vagt"
        : `Overlapper ${preview.overlapCount} eksisterende vagter`
    );
  }

  return "Ingen overlap";
}
