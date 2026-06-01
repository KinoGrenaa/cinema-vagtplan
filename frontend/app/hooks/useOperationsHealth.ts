export type OperationsHealth = {
  activeShiftCount: number;
  highFatigueEmployees: number;
  moviePressure: number;
  staffingHealth: "STABLE" | "HIGH_PRESSURE" | "CRITICAL";
};

export function useOperationsHealth(
  shifts: any[],
  movies: any[],
): OperationsHealth {
  const activeShiftCount = shifts.length;

  const highFatigueEmployees = shifts.filter((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 8;
  }).length;

  const moviePressure = movies.reduce((sum, movie) => sum + movie.soldSeats, 0);

  let staffingHealth: OperationsHealth["staffingHealth"] = "STABLE";

  if (moviePressure >= 400 || highFatigueEmployees >= 4) {
    staffingHealth = "HIGH_PRESSURE";
  }

  if (moviePressure >= 600 || highFatigueEmployees >= 6) {
    staffingHealth = "CRITICAL";
  }

  return {
    activeShiftCount,
    highFatigueEmployees,
    moviePressure,
    staffingHealth,
  };
}
