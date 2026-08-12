"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Shift } from "../../../../../../shared/types";

type ShiftTimelineProps = {
  shifts: Shift[];
  selectedDate: string;
  onSelectShift: (shift: Shift) => void;
  onOpenCreateShift?: () => void;
};

type TimelineShift = {
  shift: Shift;
  startMinutes: number;
  endMinutes: number;
  left: number;
  width: number;
  lane: number;
};

type TimelineRange = {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
};

const DAY_MINUTES = 24 * 60;
const RANGE_PADDING_MINUTES = 60;
const MIN_VISIBLE_SHIFT_MINUTES = 15;
const MIN_TIMELINE_HEIGHT = 260;
const LEFT_LABEL_WIDTH = 64;
const SHIFT_HEIGHT = 78;
const LANE_GAP = 10;
const TOP_OFFSET = 52;
const BOTTOM_ACTION_SPACE = 72;
const MIN_SHIFT_WIDTH = 36;
const MIN_TIME_MARK_GAP_MINUTES = 30;

function getShiftUserId(shift: Shift) {
  return (
    shift as Shift & {
      userId?: number | null;
    }
  ).userId ?? null;
}

function getShiftUserName(shift: Shift) {
  const maybeShift = shift as Shift & {
    user?: {
      firstName?: string;
      lastName?: string;
    } | null;
  };

  if (
    maybeShift.user?.firstName ||
    maybeShift.user?.lastName
  ) {
    return `${
      maybeShift.user.firstName ?? ""
    } ${
      maybeShift.user.lastName ?? ""
    }`.trim();
  }

  const shiftUserId = getShiftUserId(shift);

  return shiftUserId
    ? `Medarbejder #${shiftUserId}`
    : "Ikke tildelt";
}

function getShiftJobFunctionName(shift: Shift) {
  const maybeShift = shift as Shift & {
    jobFunction?: {
      name?: string;
      color?: string | null;
    };
  };

  return (
    maybeShift.jobFunction?.name ??
    `Jobfunktion #${shift.jobFunctionId}`
  );
}

function getShiftColor(shift: Shift) {
  const maybeShift = shift as Shift & {
    jobFunction?: {
      color?: string | null;
    };
  };

  return (
    maybeShift.jobFunction?.color || "#2563eb"
  );
}

function getActiveTradeLabel(shift: Shift) {
  const trade = shift.trades?.[0];

  if (!trade) return null;
  if (trade.type === "POOL") return "I vagtpuljen";

  const targetName =
    `${trade.targetUser?.firstName ?? ""} ${trade.targetUser?.lastName ?? ""}`.trim();
  return `Direkte tilbud → ${targetName || "kollega"}`;
}

function getActiveStaffingRequestLabel(shift: Shift) {
  const request = shift.staffingRequests?.[0];

  if (!request) return null;

  const targetName =
    `${request.targetUser?.firstName ?? ""} ${request.targetUser?.lastName ?? ""}`.trim();

  return targetName
    ? `Bemanding \u2192 ${targetName}`
    : "Bemanding \u2192 alle kvalificerede";
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(
    "da-DK",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function formatMinutes(totalMinutes: number) {
  if (totalMinutes === DAY_MINUTES) {
    return "24:00";
  }

  const normalized = Math.max(
    0,
    Math.min(DAY_MINUTES - 1, totalMinutes),
  );
  const hour = Math.floor(
    normalized / 60,
  );
  const minute = normalized % 60;

  return `${String(hour).padStart(
    2,
    "0",
  )}:${String(minute).padStart(2, "0")}`;
}

function clampMinutes(value: number) {
  return Math.max(
    0,
    Math.min(DAY_MINUTES, value),
  );
}

function selectedDateStart(
  selectedDate: string,
) {
  return new Date(
    `${selectedDate}T00:00:00`,
  );
}

function selectedDateEnd(selectedDate: string) {
  const end = selectedDateStart(selectedDate);
  end.setDate(end.getDate() + 1);
  return end;
}

function getVisibleShiftMinutes(
  shift: Shift,
  selectedDate: string,
) {
  const dayStart =
    selectedDateStart(selectedDate);
  const dayEnd = selectedDateEnd(selectedDate);
  const shiftStart = new Date(shift.startTime);
  const shiftEnd = new Date(shift.endTime);

  if (
    shiftEnd <= dayStart ||
    shiftStart >= dayEnd
  ) {
    return null;
  }

  const visibleStart = Math.max(
    shiftStart.getTime(),
    dayStart.getTime(),
  );
  const visibleEnd = Math.min(
    shiftEnd.getTime(),
    dayEnd.getTime(),
  );
  const startMinutes = clampMinutes(
    Math.round(
      (visibleStart - dayStart.getTime()) /
        60000,
    ),
  );
  const endMinutes = clampMinutes(
    Math.round(
      (visibleEnd - dayStart.getTime()) /
        60000,
    ),
  );

  return {
    startMinutes,
    endMinutes: Math.max(
      endMinutes,
      startMinutes + MIN_VISIBLE_SHIFT_MINUTES,
    ),
  };
}

function getTimelineRange(
  shifts: Shift[],
  selectedDate: string,
): TimelineRange {
  const visibleRanges = shifts
    .map((shift) =>
      getVisibleShiftMinutes(
        shift,
        selectedDate,
      ),
    )
    .filter(
      (
        range,
      ): range is {
        startMinutes: number;
        endMinutes: number;
      } => range !== null,
    );

  if (visibleRanges.length === 0) {
    return {
      startMinutes: 0,
      endMinutes: DAY_MINUTES,
      durationMinutes: DAY_MINUTES,
    };
  }

  const earliestStart = Math.min(
    ...visibleRanges.map(
      (range) => range.startMinutes,
    ),
  );
  const latestEnd = Math.max(
    ...visibleRanges.map(
      (range) => range.endMinutes,
    ),
  );

  const rawStart = Math.max(
    0,
    earliestStart - RANGE_PADDING_MINUTES,
  );
  const rawEnd = Math.min(
    DAY_MINUTES,
    latestEnd + RANGE_PADDING_MINUTES,
  );

  const startMinutes = rawStart;
  const endMinutes = rawEnd;

  return {
    startMinutes,
    endMinutes,
    durationMinutes: Math.max(
      MIN_VISIBLE_SHIFT_MINUTES,
      endMinutes - startMinutes,
    ),
  };
}

function buildTimelineShifts(
  shifts: Shift[],
  selectedDate: string,
  timelineWidth: number,
  range: TimelineRange,
) {
  const safeTimelineWidth = Math.max(
    1,
    timelineWidth,
  );

  const dayShifts = shifts
    .map((shift) => {
      const visibleMinutes =
        getVisibleShiftMinutes(
          shift,
          selectedDate,
        );

      if (!visibleMinutes) {
        return null;
      }

      const startMinutes = Math.max(
        range.startMinutes,
        visibleMinutes.startMinutes,
      );
      const endMinutes = Math.min(
        range.endMinutes,
        visibleMinutes.endMinutes,
      );

      if (endMinutes <= startMinutes) {
        return null;
      }

      const left =
        ((startMinutes - range.startMinutes) /
          range.durationMinutes) *
        safeTimelineWidth;
      const width = Math.max(
        MIN_SHIFT_WIDTH,
        ((endMinutes - startMinutes) /
          range.durationMinutes) *
          safeTimelineWidth,
      );

      return {
        shift,
        startMinutes,
        endMinutes,
        left,
        width,
        lane: 0,
      } satisfies TimelineShift;
    })
    .filter(
      (item): item is TimelineShift =>
        item !== null,
    )
    .sort(
      (a, b) =>
        a.startMinutes - b.startMinutes ||
        a.endMinutes - b.endMinutes,
    );

  const groups: TimelineShift[][] = [];

  for (const item of dayShifts) {
    const existingGroup = groups.find(
      (group) =>
        group.some(
          (other) =>
            item.startMinutes <
              other.endMinutes &&
            item.endMinutes >
              other.startMinutes,
        ),
    );

    if (existingGroup) {
      existingGroup.push(item);
    } else {
      groups.push([item]);
    }
  }

  for (const group of groups) {
    const lanes: TimelineShift[][] = [];

    for (const item of group) {
      const laneIndex = lanes.findIndex(
        (lane) =>
          lane.every(
            (other) =>
              item.endMinutes <=
                other.startMinutes ||
              item.startMinutes >=
                other.endMinutes,
          ),
      );

      if (laneIndex === -1) {
        item.lane = lanes.length;
        lanes.push([item]);
      } else {
        item.lane = laneIndex;
        lanes[laneIndex].push(item);
      }
    }
  }

  return dayShifts;
}

function buildTimeMarks(
  range: TimelineRange,
) {
  const marks = new Set<number>([
    range.startMinutes,
    range.endMinutes,
  ]);
  const firstWholeHour =
    Math.ceil(
      range.startMinutes / 60,
    ) * 60;

  for (
    let minute = firstWholeHour;
    minute < range.endMinutes;
    minute += 60
  ) {
    const minutesFromStart =
      minute - range.startMinutes;
    const minutesToEnd =
      range.endMinutes - minute;

    if (
      minutesFromStart <
        MIN_TIME_MARK_GAP_MINUTES ||
      minutesToEnd <
        MIN_TIME_MARK_GAP_MINUTES
    ) {
      continue;
    }

    marks.add(minute);
  }

  return Array.from(marks).sort(
    (a, b) => a - b,
  );
}

function ShiftTimeline({
  shifts,
  selectedDate,
  onSelectShift,
  onOpenCreateShift,
}: ShiftTimelineProps) {
  const timelineRef =
    useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] =
    useState(1);

  useEffect(() => {
    const element = timelineRef.current;

    if (!element) return;

    const updateWidth = () => {
      setTimelineWidth(
        Math.max(1, element.clientWidth),
      );
    };

    updateWidth();

    const resizeObserver =
      new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () =>
      resizeObserver.disconnect();
  }, []);

  const timelineRange = useMemo(
    () =>
      getTimelineRange(
        shifts,
        selectedDate,
      ),
    [selectedDate, shifts],
  );

  const timelineShifts = useMemo(
    () =>
      buildTimelineShifts(
        shifts,
        selectedDate,
        timelineWidth,
        timelineRange,
      ),
    [
      selectedDate,
      shifts,
      timelineRange,
      timelineWidth,
    ],
  );

  const timeMarks = useMemo(
    () =>
      buildTimeMarks(timelineRange),
    [timelineRange],
  );

  const laneCount = Math.max(
    1,
    ...timelineShifts.map(
      (item) => item.lane + 1,
    ),
  );
  const dynamicHeight = Math.max(
    MIN_TIMELINE_HEIGHT,
    TOP_OFFSET +
      laneCount *
        (SHIFT_HEIGHT + LANE_GAP) +
      BOTTOM_ACTION_SPACE,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Dagsoversigt
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Viser {formatMinutes(
            timelineRange.startMinutes,
          )}–{formatMinutes(
            timelineRange.endMinutes,
          )} med 1 times luft før og efter dagens vagter, begrænset af
          døgnets start og slut.
        </p>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        <div
          className="relative w-full"
          style={{
            height: dynamicHeight,
          }}
        >
          <div
            className="absolute bottom-0 top-0 border-l border-gray-300 dark:border-gray-700"
            style={{
              left: LEFT_LABEL_WIDTH,
            }}
          />

          <div
            className="absolute bottom-0 top-0"
            style={{
              left: LEFT_LABEL_WIDTH,
              right: 0,
            }}
          >
            {timeMarks.map((minute) => {
              const leftPercent =
                ((minute -
                  timelineRange.startMinutes) /
                  timelineRange.durationMinutes) *
                100;
              const isStart =
                minute ===
                timelineRange.startMinutes;
              const isEnd =
                minute ===
                timelineRange.endMinutes;

              return (
                <div
                  key={minute}
                  className="absolute bottom-0 top-0 border-l border-gray-200 dark:border-gray-800"
                  style={{
                    left: isEnd
                      ? "calc(100% - 1px)"
                      : `${leftPercent}%`,
                  }}
                >
                  <div
                    className={`absolute top-2 whitespace-nowrap text-[11px] font-medium text-gray-500 dark:text-gray-400 ${
                      isStart
                        ? "pl-1"
                        : isEnd
                          ? "-translate-x-full pr-1"
                          : "-translate-x-1/2"
                    }`}
                  >
                    {formatMinutes(minute)}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="absolute left-0 text-xs font-semibold text-gray-500 dark:text-gray-400"
            style={{
              top: TOP_OFFSET + 20,
            }}
          >
            Vagter
          </div>

          <div
            ref={timelineRef}
            className="absolute"
            style={{
              left: LEFT_LABEL_WIDTH,
              right: 0,
              top: TOP_OFFSET,
              height:
                dynamicHeight -
                TOP_OFFSET -
                BOTTOM_ACTION_SPACE,
            }}
          >
            {timelineShifts.map(
              ({
                shift,
                left,
                width,
                lane,
              }) => {
                const y =
                  lane *
                  (SHIFT_HEIGHT +
                    LANE_GAP);
                const shiftUserId =
                  getShiftUserId(shift);

                return (
                  <div
                    key={shift.id}
                    className="absolute z-10"
                    style={{
                      left,
                      top: y,
                      width,
                      height: SHIFT_HEIGHT,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        onSelectShift(shift)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          onSelectShift(shift);
                        }
                      }}
                      className="h-full cursor-pointer overflow-hidden rounded-xl border border-white/50 p-2 text-white shadow-lg transition hover:brightness-95"
                      style={{
                        backgroundColor:
                          getShiftColor(shift),
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black leading-tight tracking-tight">
                            {getShiftJobFunctionName(
                              shift,
                            )}
                          </div>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            {shiftUserId ? (
                              <div className="truncate text-[13px] font-black leading-tight drop-shadow-sm">
                                {getShiftUserName(
                                  shift,
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex shrink-0 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 shadow-sm">
                                Ikke tildelt
                              </span>
                            )}
                          </div>
                          {getActiveTradeLabel(shift) && (
                            <span className="mt-1 inline-flex max-w-full truncate rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-black text-blue-800 shadow-sm">
                              {getActiveTradeLabel(shift)}
                            </span>
                          )}
                          {getActiveStaffingRequestLabel(shift) && (
                            <span className="mt-1 inline-flex max-w-full truncate rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-black text-amber-900 shadow-sm">
                              {getActiveStaffingRequestLabel(shift)}
                            </span>
                          )}
                        </div>

                        <div className="shrink-0 text-right text-[11px] font-bold opacity-95">
                          {formatTime(
                            shift.startTime,
                          )}
                          -
                          {formatTime(
                            shift.endTime,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          {onOpenCreateShift && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <button
                type="button"
                onClick={onOpenCreateShift}
                className="pointer-events-auto inline-flex items-center gap-2 border-b-2 border-blue-500 px-2 pb-1.5 text-base font-bold text-blue-700 transition hover:border-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-400 dark:text-blue-300 dark:hover:border-blue-200 dark:hover:text-blue-100"
              >
                <span aria-hidden="true">+</span>
                Opret vagt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ShiftTimeline);
