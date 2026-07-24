"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Rnd } from "react-rnd";
import type { Shift } from "../../../../../../shared/types";

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type ShiftTimelineProps = {
  shifts: Shift[];
  users: User[];
  selectedDate: string;
  createAtTimeLabel?: string | null;
  createDurationMinutes?:
    number | null;
  onCreateAtTime?: (
    hour: number,
    minute: number,
  ) => void;
  onSelectShift: (shift: Shift) => void;
  onMoveShift: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) => Promise<void> | void;
  onChangeShiftUser: (
    shift: Shift,
    newUserId: number | null,
  ) => Promise<void> | void;
  onResizeShift: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) => Promise<void> | void;
};

type TimelineShift = {
  shift: Shift;
  startMinutes: number;
  endMinutes: number;
  left: number;
  width: number;
  lane: number;
  laneCount: number;
};

const DAY_MINUTES = 24 * 60;
const TIMELINE_HEIGHT = 520;
const LEFT_LABEL_WIDTH = 64;
const SHIFT_HEIGHT = 64;
const LANE_GAP = 10;
const TOP_OFFSET = 52;
const SNAP_MINUTES = 15;
const MIN_SHIFT_WIDTH = 36;
const DEFAULT_CREATION_MINUTES = 14 * 60;
const LAST_CREATION_MINUTES =
  DAY_MINUTES - SNAP_MINUTES;

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

function getShiftWorkTypeName(shift: Shift) {
  const maybeShift = shift as Shift & {
    workType?: {
      name?: string;
      color?: string | null;
    };
  };

  return (
    maybeShift.workType?.name ??
    `Arbejdstype #${shift.workTypeId}`
  );
}

function getShiftColor(shift: Shift) {
  const maybeShift = shift as Shift & {
    workType?: {
      color?: string | null;
    };
  };

  return (
    maybeShift.workType?.color || "#2563eb"
  );
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
  const hour = Math.floor(
    totalMinutes / 60,
  );
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(
    2,
    "0",
  )}:${String(minute).padStart(2, "0")}`;
}

function formatCreationRange(
  startMinutes: number,
  durationMinutes:
    | number
    | null
    | undefined,
) {
  if (!durationMinutes) {
    return formatMinutes(
      startMinutes,
    );
  }

  const endMinutes =
    startMinutes +
    durationMinutes;
  const endDayOffset =
    Math.floor(
      endMinutes / DAY_MINUTES,
    );
  const normalizedEnd =
    endMinutes % DAY_MINUTES;

  return (
    `${formatMinutes(startMinutes)}–` +
    `${formatMinutes(normalizedEnd)}` +
    (endDayOffset > 0
      ? " (+1 dag)"
      : "")
  );
}

function clampMinutes(value: number) {
  return Math.max(
    0,
    Math.min(DAY_MINUTES, value),
  );
}

function snapMinutes(value: number) {
  return (
    Math.round(value / SNAP_MINUTES) *
    SNAP_MINUTES
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
      startMinutes + SNAP_MINUTES,
    ),
  };
}

function xToTime(
  x: number,
  timelineWidth: number,
) {
  const safeTimelineWidth = Math.max(
    1,
    timelineWidth,
  );
  const totalMinutes = clampMinutes(
    snapMinutes(
      (x / safeTimelineWidth) *
        DAY_MINUTES,
    ),
  );
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return { hour, minute };
}

function xToCreationMinutes(
  x: number,
  timelineWidth: number,
) {
  const { hour, minute } = xToTime(
    x,
    timelineWidth,
  );

  return Math.min(
    LAST_CREATION_MINUTES,
    hour * 60 + minute,
  );
}

function buildTimelineShifts(
  shifts: Shift[],
  selectedDate: string,
  timelineWidth: number,
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

      const { startMinutes, endMinutes } =
        visibleMinutes;
      const safeEndMinutes = Math.max(
        endMinutes,
        startMinutes + SNAP_MINUTES,
      );
      const left =
        (startMinutes / DAY_MINUTES) *
        safeTimelineWidth;
      const width = Math.max(
        MIN_SHIFT_WIDTH,
        ((safeEndMinutes - startMinutes) /
          DAY_MINUTES) *
          safeTimelineWidth,
      );

      return {
        shift,
        startMinutes,
        endMinutes: safeEndMinutes,
        left,
        width,
        lane: 0,
        laneCount: 1,
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

    for (const item of group) {
      item.laneCount = lanes.length;
    }
  }

  return dayShifts;
}

function ShiftTimeline({
  shifts,
  users,
  selectedDate,
  createAtTimeLabel,
  createDurationMinutes,
  onCreateAtTime,
  onSelectShift,
  onMoveShift,
  onChangeShiftUser,
  onResizeShift,
}: ShiftTimelineProps) {
  const timelineRef =
    useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] =
    useState(1);
  const [creationPreviewMinutes, setCreationPreviewMinutes] =
    useState<number | null>(null);
  const dragStartPositionRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const resizeStartRef = useRef(false);
  const creationEnabled =
    typeof onCreateAtTime === "function";

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

  useEffect(() => {
    setCreationPreviewMinutes(
      creationEnabled
        ? DEFAULT_CREATION_MINUTES
        : null,
    );
  }, [creationEnabled, selectedDate]);

  const timelineShifts = useMemo(
    () =>
      buildTimelineShifts(
        shifts,
        selectedDate,
        timelineWidth,
      ),
    [selectedDate, shifts, timelineWidth],
  );
  const hours = useMemo(
    () =>
      Array.from(
        { length: 25 },
        (_, hour) => hour,
      ),
    [],
  );
  const laneCount = Math.max(
    1,
    ...timelineShifts.map(
      (item) => item.lane + 1,
    ),
  );
  const dynamicHeight = Math.max(
    TIMELINE_HEIGHT,
    TOP_OFFSET +
      laneCount *
        (SHIFT_HEIGHT + LANE_GAP) +
      48,
  );

  function getPointerCreationMinutes(
    clientX: number,
  ) {
    const bounds =
      timelineRef.current?.getBoundingClientRect();

    if (!bounds) {
      return null;
    }

    return xToCreationMinutes(
      clientX - bounds.left,
      bounds.width,
    );
  }

  function handleTimelineMouseMove(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      !creationEnabled ||
      event.target !== event.currentTarget
    ) {
      return;
    }

    const nextMinutes =
      getPointerCreationMinutes(
        event.clientX,
      );

    if (nextMinutes !== null) {
      setCreationPreviewMinutes(
        nextMinutes,
      );
    }
  }

  function handleTimelineClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      !onCreateAtTime ||
      event.target !== event.currentTarget
    ) {
      return;
    }

    const nextMinutes =
      getPointerCreationMinutes(
        event.clientX,
      );

    if (nextMinutes === null) {
      return;
    }

    onCreateAtTime(
      Math.floor(nextMinutes / 60),
      nextMinutes % 60,
    );
  }

  function handleTimelineKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      !onCreateAtTime ||
      creationPreviewMinutes === null ||
      (event.key !== "Enter" &&
        event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();
    onCreateAtTime(
      Math.floor(
        creationPreviewMinutes / 60,
      ),
      creationPreviewMinutes % 60,
    );
  }

  const creationLeftPercent =
    creationPreviewMinutes === null
      ? null
      : (creationPreviewMinutes /
          DAY_MINUTES) *
        100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Dagsoversigt
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {creationEnabled
              ? "Klik på et tomt tidspunkt for at placere den untildelte vagt. Tiden snapper til nærmeste kvarter."
              : "Hele dagen vises skaleret fra 00:00 til 24:00."}
          </p>
        </div>

        {creationEnabled && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
            Placér: {createAtTimeLabel || "jobfunktion"}
          </span>
        )}
      </div>

      <div
        className={`w-full overflow-hidden rounded-xl border bg-gray-50 dark:bg-gray-950 ${
          creationEnabled
            ? "border-blue-400 ring-2 ring-blue-500/15 dark:border-blue-700"
            : "border-gray-200 dark:border-gray-800"
        }`}
      >
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
            {hours.map((hour) => {
              const leftPercent =
                (hour / 24) * 100;

              return (
                <div
                  key={hour}
                  className="absolute bottom-0 top-0 border-l border-gray-200 dark:border-gray-800"
                  style={{
                    left:
                      hour === 24
                        ? "calc(100% - 1px)"
                        : `${leftPercent}%`,
                  }}
                >
                  <div
                    className={`absolute top-2 text-[11px] font-medium text-gray-500 dark:text-gray-400 ${
                      hour === 24
                        ? "-translate-x-full pr-1"
                        : "-translate-x-1/2"
                    }`}
                  >
                    {String(hour).padStart(
                      2,
                      "0",
                    )}
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

          {timelineShifts.length === 0 && (
            <div
              className="pointer-events-none absolute rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              style={{
                left:
                  LEFT_LABEL_WIDTH + 16,
                top: TOP_OFFSET,
              }}
            >
              {creationEnabled
                ? "Klik på tidslinjen for at placere den første vagt."
                : "Ingen vagter på den valgte dato."}
            </div>
          )}

          <div
            ref={timelineRef}
            role={
              creationEnabled
                ? "button"
                : undefined
            }
            tabIndex={
              creationEnabled ? 0 : undefined
            }
            aria-label={
              creationEnabled
                ? `Placér ${
                    createAtTimeLabel ||
                    "jobfunktion"
                  } på tidslinjen`
                : undefined
            }
            onMouseMove={
              handleTimelineMouseMove
            }
            onClick={handleTimelineClick}
            onKeyDown={handleTimelineKeyDown}
            className={`absolute outline-none ${
              creationEnabled
                ? "cursor-crosshair focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                : ""
            }`}
            style={{
              left: LEFT_LABEL_WIDTH,
              right: 0,
              top: TOP_OFFSET,
              height:
                dynamicHeight -
                TOP_OFFSET -
                24,
            }}
          >
            {creationEnabled &&
              creationLeftPercent !== null &&
              creationPreviewMinutes !== null && (
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-blue-600 dark:border-blue-400"
                  style={{
                    left: `${creationLeftPercent}%`,
                  }}
                >
                  <div
                    className={`absolute top-0 whitespace-nowrap rounded-lg bg-blue-700 px-2 py-1 text-xs font-bold text-white shadow-lg dark:bg-blue-500 ${
                      creationPreviewMinutes >=
                        18 * 60
                        ? "-translate-x-full"
                        : ""
                    }`}
                  >
                    {createAtTimeLabel ||
                      "Jobfunktion"}{" "}
                    · {formatCreationRange(
                creationPreviewMinutes,
                createDurationMinutes,
              )}
                  </div>
                </div>
              )}

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
                  <Rnd
                    key={shift.id}
                    bounds="parent"
                    dragAxis="x"
                    enableResizing={{
                      top: false,
                      right: true,
                      bottom: false,
                      left: true,
                      topRight: false,
                      bottomRight: false,
                      bottomLeft: false,
                      topLeft: false,
                    }}
                    minWidth={MIN_SHIFT_WIDTH}
                    size={{
                      width,
                      height: SHIFT_HEIGHT,
                    }}
                    position={{
                      x: left,
                      y,
                    }}
                    onDragStart={(_, data) => {
                      dragStartPositionRef.current = {
                        x: data.x,
                        y: data.y,
                      };
                    }}
                    onDragStop={(_, data) => {
                      const dragStartPosition =
                        dragStartPositionRef.current;
                      dragStartPositionRef.current =
                        null;

                      if (
                        dragStartPosition &&
                        Math.round(
                          dragStartPosition.x,
                        ) ===
                          Math.round(data.x) &&
                        Math.round(
                          dragStartPosition.y,
                        ) ===
                          Math.round(data.y)
                      ) {
                        return;
                      }

                      const { hour, minute } =
                        xToTime(
                          data.x,
                          timelineWidth,
                        );
                      onMoveShift(
                        shift,
                        hour,
                        minute,
                      );
                    }}
                    onResizeStart={() => {
                      resizeStartRef.current =
                        true;
                    }}
                    onResizeStop={(
                      _,
                      __,
                      ref,
                      ___,
                      position,
                    ) => {
                      resizeStartRef.current =
                        false;
                      const start = xToTime(
                        position.x,
                        timelineWidth,
                      );
                      const end = xToTime(
                        position.x +
                          ref.offsetWidth,
                        timelineWidth,
                      );

                      onResizeShift(
                        shift,
                        start.hour,
                        start.minute,
                        end.hour,
                        end.minute,
                      );
                    }}
                    className="z-10"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();

                        if (
                          resizeStartRef.current
                        ) {
                          return;
                        }

                        onSelectShift(shift);
                      }}
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold">
                            {getShiftUserName(
                              shift,
                            )}
                          </div>
                          <div className="truncate text-[11px] opacity-90">
                            {getShiftWorkTypeName(
                              shift,
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right text-[11px] font-semibold opacity-90">
                          {formatTime(
                            shift.startTime,
                          )}
                          -
                          {formatTime(
                            shift.endTime,
                          )}
                        </div>
                      </div>

                      {users.length > 0 && (
                        <select
                          value={
                            shiftUserId ?? ""
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          onChange={(event) =>
                            onChangeShiftUser(
                              shift,
                              event.target.value
                                ? Number(
                                    event.target
                                      .value,
                                  )
                                : null,
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-white/30 bg-white/90 px-2 py-0.5 text-[11px] text-gray-900 dark:bg-gray-950 dark:text-gray-100"
                        >
                          <option value="">
                            Ikke tildelt
                          </option>
                          {users.map((user) => (
                            <option
                              key={user.id}
                              value={user.id}
                            >
                              {user.firstName}{" "}
                              {user.lastName}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </Rnd>
                );
              },
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ShiftTimeline);
