import type { Shift } from "../../../../../shared/types";

function createDateTimeFromSelectedDate(
  selectedDate: string,
  hour: number,
  minute: number,
) {
  const date = new Date(`${selectedDate}T00:00:00`);

  date.setHours(hour, minute, 0, 0);

  return date;
}

function getSelectedDayRange(selectedDate: string) {
  const start = new Date(`${selectedDate}T00:00:00`);
  const end = new Date(start);

  end.setDate(end.getDate() + 1);

  return { start, end };
}

type MoveShiftTimeInput = {
  shift: Shift;
  selectedDate: string;
  newStartHour: number;
  newStartMinute: number;
};

export function getMovedShiftTimes({
  shift,
  selectedDate,
  newStartHour,
  newStartMinute,
}: MoveShiftTimeInput) {
  const oldStart = new Date(shift.startTime);
  const oldEnd = new Date(shift.endTime);
  const durationMs = oldEnd.getTime() - oldStart.getTime();

  const { start: dayStart } = getSelectedDayRange(selectedDate);

  const visibleStart =
    oldStart.getTime() > dayStart.getTime() ? oldStart : dayStart;

  const visibleOffsetMs = visibleStart.getTime() - oldStart.getTime();

  const newVisibleStart = createDateTimeFromSelectedDate(
    selectedDate,
    newStartHour,
    newStartMinute,
  );

  const newStart = new Date(newVisibleStart.getTime() - visibleOffsetMs);
  const newEnd = new Date(newStart.getTime() + durationMs);

  return { newStart, newEnd };
}

type ResizeShiftTimeInput = {
  shift: Shift;
  selectedDate: string;
  newStartHour: number;
  newStartMinute: number;
  newEndHour: number;
  newEndMinute: number;
};

export function getResizedShiftTimes({
  shift,
  selectedDate,
  newStartHour,
  newStartMinute,
  newEndHour,
  newEndMinute,
}: ResizeShiftTimeInput) {
  const oldStart = new Date(shift.startTime);
  const oldEnd = new Date(shift.endTime);

  const { start: dayStart, end: dayEnd } = getSelectedDayRange(selectedDate);

  const visibleStart =
    oldStart.getTime() > dayStart.getTime() ? oldStart : dayStart;

  const visibleEnd = oldEnd.getTime() < dayEnd.getTime() ? oldEnd : dayEnd;

  const hiddenBeforeMs = visibleStart.getTime() - oldStart.getTime();

  const hiddenAfterMs = oldEnd.getTime() - visibleEnd.getTime();

  const newVisibleStart = createDateTimeFromSelectedDate(
    selectedDate,
    newStartHour,
    newStartMinute,
  );

  const newVisibleEnd = createDateTimeFromSelectedDate(
    selectedDate,
    newEndHour,
    newEndMinute,
  );

  const newStart = new Date(newVisibleStart.getTime() - hiddenBeforeMs);
  const newEnd = new Date(newVisibleEnd.getTime() + hiddenAfterMs);

  return { newStart, newEnd };
}
