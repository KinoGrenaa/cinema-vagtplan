"use client";

import { memo, useCallback, useMemo } from "react";
import type { Shift, User } from "../../../../../shared/types";
import ShiftCard from "./ShiftCard";

const HOURS = Array.from({ length: 25 }, (_, i) =>
  i.toString().padStart(2, "0"),
);

const HOUR_LINES = Array.from({ length: 25 }, (_, index) => index);
const HALF_HOUR_LINES = Array.from({ length: 24 }, (_, index) => index);
const LANES = Array.from({ length: 8 }, (_, index) => index);

const TIMELINE_WIDTH = 2400;
const START_HOUR = 0;
const TOTAL_HOURS = 24;

type ShiftTimelineProps = {
  shifts: Shift[];
  users: User[];
  selectedDate: string;

  onSelectShift: (shift: Shift) => void;

  onMoveShift: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
  ) => void;

  onChangeShiftUser: (shift: Shift, newUserId: number) => void;

  onResizeShift: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) => void;
};

function ShiftTimelineComponent({
  shifts,
  users,
  selectedDate,
  onSelectShift,
  onMoveShift,
  onChangeShiftUser,
  onResizeShift,
}: ShiftTimelineProps) {
  const nowMeta = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    return {
      showNowLine: selectedDate === today,
      nowLeft:
        ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * TIMELINE_WIDTH,
    };
  }, [selectedDate]);

  const calculateLeft = useCallback((startTime: string) => {
    const date = new Date(startTime);
    const minutes = date.getHours() * 60 + date.getMinutes();

    return (minutes / (TOTAL_HOURS * 60)) * TIMELINE_WIDTH;
  }, []);

  const calculateWidth = useCallback((startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60;

    return (durationMinutes / (TOTAL_HOURS * 60)) * TIMELINE_WIDTH;
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="overflow-x-auto">
        <div style={{ width: TIMELINE_WIDTH }} className="relative">
          <div
            className="sticky top-0 z-30 grid border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
            style={{
              gridTemplateColumns: `repeat(${HOURS.length}, 1fr)`,
            }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="border-r border-gray-200 p-2 text-center dark:border-gray-800"
              >
                {hour}:00
              </div>
            ))}
          </div>

          <div className="relative h-[520px] bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
            {HOUR_LINES.map((index) => (
              <div
                key={`hour-${index}`}
                className="absolute bottom-0 top-0 z-0 border-l border-gray-300 dark:border-gray-800"
                style={{
                  left: `${(index / 24) * TIMELINE_WIDTH}px`,
                }}
              />
            ))}

            {HALF_HOUR_LINES.map((index) => (
              <div
                key={`half-${index}`}
                className="absolute bottom-0 top-0 z-0 border-l border-dashed border-gray-200 dark:border-gray-900"
                style={{
                  left: `${((index + 0.5) / 24) * TIMELINE_WIDTH}px`,
                }}
              />
            ))}

            {LANES.map((index) => (
              <div
                key={`lane-${index}`}
                className="absolute left-0 right-0 z-0 border-t border-gray-100 dark:border-gray-900"
                style={{
                  top: `${30 + index * 84}px`,
                }}
              />
            ))}

            {nowMeta.showNowLine && (
              <div
                className="absolute bottom-0 top-0 z-40 border-l-2 border-red-500"
                style={{
                  left: `${nowMeta.nowLeft}px`,
                }}
              >
                <div className="ml-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  Nu
                </div>
              </div>
            )}

            {shifts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
                Ingen vagter på denne dag.
              </div>
            )}

            {shifts.map((shift, index) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                index={index}
                users={users}
                calculateLeft={calculateLeft}
                calculateWidth={calculateWidth}
                timelineWidth={TIMELINE_WIDTH}
                totalHours={TOTAL_HOURS}
                startHour={START_HOUR}
                onClick={() => onSelectShift(shift)}
                onMove={onMoveShift}
                onChangeUser={onChangeShiftUser}
                onResize={onResizeShift}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ShiftTimeline = memo(ShiftTimelineComponent);

export default ShiftTimeline;
