import type { MovieShowing, Shift, User } from "./liveTypes";

export function getUserName(users: User[], userId: number) {
  const user = users.find((item) => item.id === userId);

  return user ? `${user.firstName} ${user.lastName}` : "Ukendt";
}

export function isShiftActive(shift: Shift) {
  const now = new Date();
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);

  return now >= start && now <= end;
}

export function isMovieActive(movie: MovieShowing) {
  const now = new Date();
  const start = new Date(movie.startTime);
  const end = new Date(movie.endTime);

  return now >= start && now <= end;
}
