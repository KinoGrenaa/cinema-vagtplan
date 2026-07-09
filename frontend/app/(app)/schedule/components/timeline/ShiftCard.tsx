"use client";

import { memo, useCallback } from "react";
import { Rnd } from "react-rnd";

import type { Shift, User } from "../../../../../../shared/types";

type ShiftCardProps = {
  shift: Shift;
  index: number;
  users: User[];
  calculateLeft: (startTime: string) => number;
  calculateWidth: (startTime: string, endTime: string) => number;
  timelineWidth: number;
  totalHours: number;
  startHour: number;
  onClick: () => void;
  onMove: (shift: Shift, newStartHour: number, newStartMinute: number) => void;
  onResize: (
    shift: Shift,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) => void;
  onChangeUser: (shift: Shift, newUserId: number) => void;
};

function ShiftCardComponent({
  shift,
  index,
  users,
  calculateLeft,
  calculateWidth,
  timelineWidth,
  totalHours,
  startHour,
  onClick,
  onMove,
  onResize,
  onChangeUser,
}: ShiftCardProps) {
  const x = calculateLeft(shift.startTime);
  const width = calculateWidth(shift.startTime, shift.endTime);
  const y = 30 + index * 84;
  const workTypeColor = shift.workType?.color || "#3b82f6";
  const workTypeName = shift.workType?.name || "Vagt";

  const pixelsToTime = useCallback(
    (xPosition: number) => {
      const minutesPerPixel = (totalHours * 60) / timelineWidth;
      const rawMinutes = xPosition * minutesPerPixel;
      const roundedMinutes = Math.round(rawMinutes / 15) * 15;

      return {
        hour: startHour + Math.floor(roundedMinutes / 60),
        minute: roundedMinutes % 60,
      };
    },
    [startHour, timelineWidth, totalHours],
  );

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height: 74 }}
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
      minWidth={35}
      onDragStop={(_, data) => {
        const newStart = pixelsToTime(data.x);
        onMove(shift, newStart.hour, newStart.minute);
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        const newStart = pixelsToTime(position.x);
        const newEnd = pixelsToTime(position.x + ref.offsetWidth);

        onResize(
          shift,
          newStart.hour,
          newStart.minute,
          newEnd.hour,
          newEnd.minute,
        );
      }}
    >
      <div
        onDoubleClick={onClick}
        className="group relative h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-white/30 px-3 py-2 text-left text-white shadow-lg ring-1 ring-black/10 transition hover:scale-[1.01] hover:shadow-xl dark:border-white/10 dark:ring-white/10"
        style={{
          background: `linear-gradient(135deg, ${workTypeColor}, ${workTypeColor}dd)`,
        }}
      >
        <div className="absolute inset-0 bg-black/5 transition group-hover:bg-black/10 dark:bg-black/20 dark:group-hover:bg-black/10" />
        <div className="relative z-10 space-y-1">
          <select
            value={shift.userId}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => onChangeUser(shift, Number(event.target.value))}
            className="w-full rounded-lg border border-white/30 bg-white/90 px-2 py-1 text-sm font-medium text-black shadow-sm outline-none transition focus:ring-2 focus:ring-white/50 dark:bg-gray-950/90 dark:text-white"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-semibold uppercase tracking-wide text-white/90">
              {workTypeName}
            </div>
            <div className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              Vagt
            </div>
          </div>

          <div className="text-xs font-medium text-white/95">
            {new Date(shift.startTime).toLocaleTimeString("da-DK", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" - "}
            {new Date(shift.endTime).toLocaleTimeString("da-DK", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-2xl bg-white/25 transition group-hover:bg-white/40" />
        <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-2xl bg-white/25 transition group-hover:bg-white/40" />
      </div>
    </Rnd>
  );
}

const ShiftCard = memo(ShiftCardComponent);

export default ShiftCard;
