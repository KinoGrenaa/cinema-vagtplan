export function usePredictiveStaffing(movies: any[], shifts: any[]) {
  return movies
    .map((movie) => {
      const staffingNeed = Math.ceil(movie.soldSeats / 80);

      const activeShifts = shifts.filter((shift) => {
        const shiftStart = new Date(shift.startTime);

        const movieStart = new Date(movie.startTime);

        return shiftStart.getHours() === movieStart.getHours();
      }).length;

      const shortage = staffingNeed - activeShifts;

      return {
        movieTitle: movie.title || "Ukendt film",
        staffingNeed,
        activeShifts,
        shortage,
        severity:
          shortage > 3 ? "CRITICAL" : shortage > 1 ? "WARNING" : "STABLE",
      };
    })
    .filter((item) => item.shortage > 0);
}
