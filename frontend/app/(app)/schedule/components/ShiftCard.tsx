"use client";

import { Rnd } from "react-rnd";

type ShiftCardProps = {
  shift: any;
  index: number;
  users: any[];
  calculateLeft: (startTime: string) => number;
  calculateWidth: (startTime: string, endTime: string) => number;
  timelineWidth: number;
  totalHours: number;
  startHour: number;
  onClick: () => void;
  onMove: (shift: any, newStartHour: number, newStartMinute: number) => void;
  onResize: (
    shift: any,
    newStartHour: number,
    newStartMinute: number,
    newEndHour: number,
    newEndMinute: number,
  ) => void;
  onChangeUser: (shift: any, newUserId: number) => void;
};

export default function ShiftCard({
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
  const y = 30 + index * 80;

  function pixelsToTime(xPosition: number) {
    const minutesPerPixel = (totalHours * 60) / timelineWidth;
    const rawMinutes = xPosition * minutesPerPixel;
    const roundedMinutes = Math.round(rawMinutes / 15) * 15;

    return {
      hour: startHour + Math.floor(roundedMinutes / 60),
      minute: roundedMinutes % 60,
    };
  }

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height: 70 }}
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
      minWidth={25}
      onDragStop={(e, data) => {
        const newStart = pixelsToTime(data.x);
        onMove(shift, newStart.hour, newStart.minute);
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
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
        className="relative w-full h-full text-white rounded-lg shadow px-3 py-2 text-left cursor-pointer"
        style={{
          backgroundColor: shift.workType.color,
        }}
      >
        <select
          value={shift.userId}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onChangeUser(shift, Number(e.target.value))}
          className="w-full mb-1 rounded px-2 py-1 text-sm text-black"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName}
            </option>
          ))}
        </select>

        <div className="text-xs">{shift.workType.name}</div>

        <div className="text-xs">
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

        <div className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-white/20 rounded-r-lg" />
        <div className="absolute top-0 left-0 h-full w-2 cursor-ew-resize bg-white/20 rounded-l-lg" />
      </div>
    </Rnd>
  );
}
