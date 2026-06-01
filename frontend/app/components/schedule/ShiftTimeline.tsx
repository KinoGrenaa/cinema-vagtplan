"use client";

import { memo, useMemo } from "react";
import { Rnd } from "react-rnd";
import type { Shift } from "../../../../shared/types";

type User = {
  id: number;
  firstName: string;
  lastName: string;
};

type ShiftTimelineProps = {
  shifts: Shift[];
  users: User[];
  selectedDate: string;
  onSelectShift: (shift: Shift) => void;
  onMoveShift: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) => Promise<void> | void;
  onChangeShiftUser: (shift: Shift, newUserId: number) => Promise<void> | void;
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
const TIMELINE_WIDTH = 1000;
const TIMELINE_HEIGHT = 520;
const LEFT_LABEL_WIDTH = 64;
const SHIFT_HEIGHT = 64;
const LANE_GAP = 10;
const TOP_OFFSET = 52;
const SNAP_MINUTES = 15;
const MIN_SHIFT_WIDTH = 36;
const MINUTE_WIDTH = TIMELINE_WIDTH / DAY_MINUTES;

function getShiftUserName(shift: Shift) {
  const maybeShift = shift as Shift & {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };

  if (maybeShift.user?.firstName || maybeShift.user?.lastName) {
    return `${maybeShift.user.firstName ?? ""} ${maybeShift.user.lastName ?? ""}`.trim();
  }

  return `Medarbejder #${shift.userId}`;
}

function getShiftWorkTypeName(shift: Shift) {
  const maybeShift = shift as Shift & {
    workType?: {
      name?: string;
      color?: string | null;
    };
  };

  return maybeShift.workType?.name ?? `Arbejdstype #${shift.workTypeId}`;
}

function getShiftColor(shift: Shift) {
  const maybeShift = shift as Shift & {
    workType?: {
      color?: string | null;
    };
  };

  return maybeShift.workType?.color || "#2563eb";
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesFromDate(value: string) {
  const date = new Date(value);

  return date.getHours() * 60 + date.getMinutes();
}

function clampMinutes(value: number) {
  return Math.max(0, Math.min(DAY_MINUTES, value));
}

function snapMinutes(value: number) {
  return Math.round(value / SNAP_MINUTES) * SNAP_MINUTES;
}

function xToTime(x: number) {
  const totalMinutes = clampMinutes(snapMinutes(x / MINUTE_WIDTH));
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return { hour, minute };
}

function isSameSelectedDate(shift: Shift, selectedDate: string) {
  const startDate = new Date(shift.startTime).toISOString().slice(0, 10);
  const endDate = new Date(shift.endTime).toISOString().slice(0, 10);

  return startDate === selectedDate || endDate === selectedDate;
}

function buildTimelineShifts(shifts: Shift[], selectedDate: string) {
  const dayShifts = shifts
    .filter((shift) => isSameSelectedDate(shift, selectedDate))
    .map((shift) => {
      const startMinutes = clampMinutes(minutesFromDate(shift.startTime));
      const endMinutes = clampMinutes(minutesFromDate(shift.endTime));
      const safeEndMinutes = Math.max(endMinutes, startMinutes + SNAP_MINUTES);

      return {
        shift,
        startMinutes,
        endMinutes: safeEndMinutes,
        left: startMinutes * MINUTE_WIDTH,
        width: Math.max(
          MIN_SHIFT_WIDTH,
          (safeEndMinutes - startMinutes) * MINUTE_WIDTH,
        ),
        lane: 0,
        laneCount: 1,
      } satisfies TimelineShift;
    })
    .sort(
      (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
    );

  const groups: TimelineShift[][] = [];

  for (const item of dayShifts) {
    const existingGroup = groups.find((group) =>
      group.some(
        (other) =>
          item.startMinutes < other.endMinutes &&
          item.endMinutes > other.startMinutes,
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
      const laneIndex = lanes.findIndex((lane) =>
        lane.every(
          (other) =>
            item.endMinutes <= other.startMinutes ||
            item.startMinutes >= other.endMinutes,
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
  onSelectShift,
  onMoveShift,
  onChangeShiftUser,
  onResizeShift,
}: ShiftTimelineProps) {
  const timelineShifts = useMemo(
    () => buildTimelineShifts(shifts, selectedDate),
    [selectedDate, shifts],
  );

  const hours = useMemo(
    () => Array.from({ length: 25 }, (_, hour) => hour),
    [],
  );

  const laneCount = Math.max(1, ...timelineShifts.map((item) => item.lane + 1));

  const dynamicHeight = Math.max(
    TIMELINE_HEIGHT,
    TOP_OFFSET + laneCount * (SHIFT_HEIGHT + LANE_GAP) + 48,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Dagsoversigt
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Hele dagen vises skaleret fra 00:00 til 24:00.
          </p>
        </div>
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
            style={{ left: LEFT_LABEL_WIDTH }}
          />

          <div
            className="absolute bottom-0 top-0"
            style={{
              left: LEFT_LABEL_WIDTH,
              right: 0,
            }}
          >
            {hours.map((hour) => {
              const leftPercent = (hour / 24) * 100;

              return (
                <div
                  key={hour}
                  className="absolute bottom-0 top-0 border-l border-gray-200 dark:border-gray-800"
                  style={{
                    left: hour === 24 ? "calc(100% - 1px)" : `${leftPercent}%`,
                  }}
                >
                  <div
                    className={`absolute top-2 text-[11px] font-medium text-gray-500 dark:text-gray-400 ${
                      hour === 24
                        ? "-translate-x-full pr-1"
                        : "-translate-x-1/2"
                    }`}
                  >
                    {String(hour).padStart(2, "0")}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="absolute left-0 text-xs font-semibold text-gray-500 dark:text-gray-400"
            style={{ top: TOP_OFFSET + 20 }}
          >
            Vagter
          </div>

          {timelineShifts.length === 0 && (
            <div
              className="absolute rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              style={{
                left: LEFT_LABEL_WIDTH + 16,
                top: TOP_OFFSET,
              }}
            >
              Ingen vagter på den valgte dato.
            </div>
          )}

          <div
            className="absolute"
            style={{
              left: LEFT_LABEL_WIDTH,
              right: 0,
              top: TOP_OFFSET,
              height: dynamicHeight - TOP_OFFSET - 24,
            }}
          >
            {timelineShifts.map(({ shift, left, width, lane }) => {
              const y = lane * (SHIFT_HEIGHT + LANE_GAP);
              const leftPercent = (left / TIMELINE_WIDTH) * 100;
              const widthPercent = (width / TIMELINE_WIDTH) * 100;

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
                    width: `${widthPercent}%`,
                    height: SHIFT_HEIGHT,
                  }}
                  position={{
                    x: left,
                    y,
                  }}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                  onDragStop={(_, data) => {
                    const { hour, minute } = xToTime(data.x);
                    onMoveShift(shift, hour, minute);
                  }}
                  onResizeStop={(_, __, ref, ___, position) => {
                    const start = xToTime(position.x);
                    const end = xToTime(position.x + ref.offsetWidth);

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
                    onClick={() => onSelectShift(shift)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        onSelectShift(shift);
                      }
                    }}
                    className="h-full cursor-pointer overflow-hidden rounded-xl border border-white/50 p-2 text-white shadow-lg transition hover:brightness-95"
                    style={{ backgroundColor: getShiftColor(shift) }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold">
                          {getShiftUserName(shift)}
                        </div>

                        <div className="truncate text-[11px] opacity-90">
                          {getShiftWorkTypeName(shift)}
                        </div>
                      </div>

                      <div className="shrink-0 text-right text-[11px] font-semibold opacity-90">
                        {formatTime(shift.startTime)}-
                        {formatTime(shift.endTime)}
                      </div>
                    </div>

                    {users.length > 0 && (
                      <select
                        value={shift.userId}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onChangeShiftUser(shift, Number(event.target.value))
                        }
                        className="mt-1 w-full rounded-lg border border-white/30 bg-white/90 px-2 py-0.5 text-[11px] text-gray-900 dark:bg-gray-950 dark:text-gray-100"
                      >
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </Rnd>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ShiftTimeline);
