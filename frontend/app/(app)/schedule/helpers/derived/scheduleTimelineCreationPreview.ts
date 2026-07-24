type PreviewShift = {
  startTime: string;
  endTime: string;
  workTypeId: number;
};

export type ScheduleTimelineCreationPreview = {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  leftPercent: number;
  widthPercent: number;
  overlapCount: number;
  sameWorkTypeOverlapCount: number;
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
    workTypeId:
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
  const sameWorkTypeOverlapCount =
    params.workTypeId
      ? overlappingShifts.filter(
          (shift) =>
            shift.workTypeId ===
            params.workTypeId,
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
    sameWorkTypeOverlapCount,
    crossesMidnight:
      previewEnd > dayEnd,
    conflictLevel:
      sameWorkTypeOverlapCount >
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
    preview.sameWorkTypeOverlapCount >
    0
  ) {
    return (
      preview.sameWorkTypeOverlapCount ===
      1
        ? "Overlapper 1 vagt med samme vagttype"
        : `Overlapper ${preview.sameWorkTypeOverlapCount} vagter med samme vagttype`
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
