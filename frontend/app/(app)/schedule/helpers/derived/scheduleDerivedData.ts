import type { Shift, User } from "../../../../../../shared/types";
import { getShiftUserId } from "../text/scheduleShiftText";

type TimeEntryWithShiftReference = {
  shiftId?: number | null;
  status?: string | null;
};

type MovieShowingWithTimeRange = {
  startTime: string | Date;
  endTime: string | Date;
};

export function getShiftsForTimeRegistration<
  TEntry extends TimeEntryWithShiftReference,
>(shifts: Shift[], timeEntries: TEntry[], currentUserId: number | null | undefined) {
  const entriesByShiftId = new Map(
    timeEntries
      .filter((entry) => entry.shiftId && entry.status !== "VOIDED")
      .map((entry) => [entry.shiftId, entry]),
  );

  return shifts
    .filter((shift) => getShiftUserId(shift) === currentUserId)
    .map((shift) => ({
      shift,
      timeEntry: entriesByShiftId.get(shift.id) ?? null,
    }));
}

export function getMovieShowingsForDate<TMovie extends MovieShowingWithTimeRange>(
  movieShowings: TMovie[],
  selectedDate: string,
) {
  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return movieShowings.filter((movie) => {
    const movieStart = new Date(movie.startTime);
    const movieEnd = new Date(movie.endTime);
    return movieStart < dayEnd && movieEnd > dayStart;
  });
}

export function getScheduleStaffingTargetUsers(users: User[]) {
  return users.filter((candidate) => {
    const userWithMeta = candidate as User & {
      isActive?: boolean;
      role?: string;
    };

    return userWithMeta.isActive !== false && userWithMeta.role !== "MASTER";
  });
}
