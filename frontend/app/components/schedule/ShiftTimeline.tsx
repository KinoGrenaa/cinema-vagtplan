"use client";

import { memo, useMemo } from "react";
import { Rnd } from "react-rnd";
import type { Shift } from "../../../../../shared/types";

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
  top: number;
  height: number;
  lane: number;
  laneCount: number;
};

const HOUR_HEIGHT = 72;
const DAY_MINUTES = 24 * 60;
const MIN_SHIFT_HEIGHT = 36;
const SNAP_MINUTES = 15;
const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;

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

function yToTime(y: number) {
  const totalMinutes = clampMinutes(snapMinutes(y / MINUTE_HEIGHT));
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
        top: startMinutes * MINUTE_HEIGHT,
        height: Math.max(
          MIN_SHIFT_HEIGHT,
          (safeEndMinutes - startMinutes) * MINUTE_HEIGHT,
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

  const hourRows = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => hour),
    [],
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div
        className="relative min-w-[900px]"
        style={{ height: TIMELINE_HEIGHT }}
      >
        {hourRows.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-800"
            style={{ top: hour * HOUR_HEIGHT }}
          >
            <div className="absolute left-0 top-1 w-20 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">
              {String(hour).padStart(2, "0")}:00
            </div>
          </div>
        ))}

        <div className="absolute bottom-0 left-20 right-0 top-0 border-l border-gray-200 dark:border-gray-800" />

        {timelineShifts.length === 0 && (
          <div className="absolute left-24 top-8 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
            Ingen vagter på den valgte dato.
          </div>
        )}

        {timelineShifts.map(({ shift, top, height, lane, laneCount }) => {
          const widthPercent = 100 / laneCount;
          const leftPercent = lane * widthPercent;

          return (
            <Rnd
              key={shift.id}
              bounds="parent"
              dragAxis="y"
              enableResizing={{
                top: true,
                right: false,
                bottom: true,
                left: false,
                topRight: false,
                bottomRight: false,
                bottomLeft: false,
                topLeft: false,
              }}
              minHeight={MIN_SHIFT_HEIGHT}
              size={{
                width: `calc(${widthPercent}% - 0.75rem)`,
                height,
              }}
              position={{
                x: 92 + leftPercent * 8,
                y: top,
              }}
              style={{
                left: `calc(${leftPercent}% + 5.75rem)`,
                width: `calc(${widthPercent}% - 0.75rem)`,
              }}
              onDragStop={(_, data) => {
                const { hour, minute } = yToTime(data.y);
                onMoveShift(shift, hour, minute);
              }}
              onResizeStop={(_, __, ref, ___, position) => {
                const start = yToTime(position.y);
                const end = yToTime(position.y + ref.offsetHeight);

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
                className="h-full cursor-pointer overflow-hidden rounded-xl border border-white/50 p-3 text-white shadow-lg transition hover:brightness-95"
                style={{ backgroundColor: getShiftColor(shift) }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">
                      {getShiftUserName(shift)}
                    </div>

                    <div className="truncate text-xs opacity-90">
                      {getShiftWorkTypeName(shift)}
                    </div>
                  </div>

                  <div className="shrink-0 text-right text-xs font-semibold opacity-90">
                    {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
                  </div>
                </div>

                {shift.note && (
                  <div className="mt-2 line-clamp-2 text-xs opacity-90">
                    {shift.note}
                  </div>
                )}

                {users.length > 0 && (
                  <select
                    value={shift.userId}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      onChangeShiftUser(shift, Number(event.target.value))
                    }
                    className="mt-2 w-full rounded-lg border border-white/30 bg-white/90 px-2 py-1 text-xs text-gray-900"
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
  );
}

export default memo(ShiftTimeline);
