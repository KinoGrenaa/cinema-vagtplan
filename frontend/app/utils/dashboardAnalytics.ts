import type {
  MovieShowing,
  Shift,
  StaffingHealth,
  TimeEntry,
} from "../types/dashboard";

export function calculatePlannedHours(shifts: Shift[]) {
  return shifts.reduce((total, shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
  }, 0);
}

export function calculateRegisteredHours(timeEntries: TimeEntry[]) {
  return timeEntries.reduce((total, entry) => {
    if (!entry.clockOut) return total;

    const start = new Date(entry.clockIn);
    const end = new Date(entry.clockOut);

    return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
  }, 0);
}

export function calculateSoldSeats(movies: MovieShowing[]) {
  return movies.reduce((total, movie) => {
    return total + movie.soldSeats;
  }, 0);
}

export function calculateSeatLoadPercent(movies: MovieShowing[]) {
  const soldSeats = movies.reduce((total, movie) => total + movie.soldSeats, 0);

  const totalCapacity = movies.reduce(
    (total, movie) => total + movie.soldSeats + movie.freeSeats,
    0,
  );

  if (totalCapacity <= 0) return 0;

  return Math.round((soldSeats / totalCapacity) * 100);
}

export function calculateStaffingWarnings(
  shifts: Shift[],
  movies: MovieShowing[],
) {
  const warnings: string[] = [];

  const todaysShiftCount = shifts.length;

  const totalSoldSeats = movies.reduce(
    (sum, movie) => sum + movie.soldSeats,
    0,
  );

  const averageLoad =
    todaysShiftCount > 0 ? totalSoldSeats / todaysShiftCount : totalSoldSeats;

  if (todaysShiftCount <= 2 && totalSoldSeats >= 150) {
    warnings.push(
      "Høj biografbelastning men meget få medarbejdere på arbejde.",
    );
  }

  if (averageLoad >= 60) {
    warnings.push("Høj belastning pr medarbejder registreret i dag.");
  }

  const overtimeRisk = shifts.some((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 8;
  });

  if (overtimeRisk) {
    warnings.push("Der er vagter i dag med overtime-risiko.");
  }

  return warnings;
}

export function calculateOperationsHealth(
  shifts: Shift[],
  movies: MovieShowing[],
) {
  const activeShiftCount = shifts.length;

  const highFatigueEmployees = shifts.filter((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 8;
  }).length;

  const moviePressure = movies.reduce((sum, movie) => sum + movie.soldSeats, 0);

  let staffingHealth: StaffingHealth = "STABLE";

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

export function calculateOperationalRecommendations(input: {
  staffingHealth: StaffingHealth;
  highFatigueEmployees: number;
  moviePressure: number;
  activeShiftCount: number;
}) {
  const recommendations: string[] = [];

  if (input.staffingHealth === "HIGH_PRESSURE") {
    recommendations.push(
      "🤖 AI anbefaler ekstra staffing mellem peak-timerne.",
    );
  }

  if (input.staffingHealth === "CRITICAL") {
    recommendations.push(
      "🚨 Kritisk staffing pressure registreret — emergency staffing anbefales.",
    );
  }

  if (input.highFatigueEmployees >= 3) {
    recommendations.push(
      "🤖 Flere medarbejdere nærmer sig fatigue-grænser — overvej omfordeling.",
    );
  }

  if (input.moviePressure >= 500) {
    recommendations.push(
      "🤖 Høj movie pressure registreret — foyer og billetsalg bør styrkes.",
    );
  }

  if (input.activeShiftCount <= 3 && input.moviePressure >= 300) {
    recommendations.push("🚨 Risiko for underbemanding registreret.");
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "✅ AI-systemet vurderer at driften er stabil lige nu.",
    );
  }

  return recommendations;
}
export function calculateStaffingHeatmap(shifts: Shift[]) {
  return shifts.map((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    let risk = "LOW";

    if (hours >= 8) risk = "MEDIUM";
    if (hours >= 10) risk = "HIGH";

    return {
      id: shift.id,
      employee: `${shift.user?.firstName ?? ""} ${
        shift.user?.lastName ?? ""
      }`.trim(),
      workType: shift.workType?.name ?? "Ukendt",
      risk,
      hours: hours.toFixed(1),
    };
  });
}

export function calculateLiveOperationsStatus(input: {
  staffingHealth: StaffingHealth;
  highFatigueEmployees: number;
  moviePressure: number;
}) {
  let status = "NORMAL";

  if (
    input.staffingHealth === "HIGH_PRESSURE" ||
    input.highFatigueEmployees >= 4 ||
    input.moviePressure >= 400
  ) {
    status = "WARNING";
  }

  if (
    input.staffingHealth === "CRITICAL" ||
    input.highFatigueEmployees >= 6 ||
    input.moviePressure >= 600
  ) {
    status = "CRITICAL";
  }

  return status;
}

export function calculatePredictiveStaffing(
  shifts: Shift[],
  movies: MovieShowing[],
) {
  const predictions: string[] = [];

  const eveningMovies = movies.filter((movie) => {
    if (!movie.startTime) return false;

    const hour = new Date(movie.startTime).getHours();

    return hour >= 18 && hour <= 22;
  });

  const eveningSoldSeats = eveningMovies.reduce(
    (sum, movie) => sum + movie.soldSeats,
    0,
  );

  const eveningShiftCount = shifts.filter((shift) => {
    const hour = new Date(shift.startTime).getHours();

    return hour >= 18 && hour <= 22;
  }).length;

  if (eveningSoldSeats >= 200 && eveningShiftCount <= 4) {
    predictions.push("📈 Fredag/lørdag aften forventes høj staffing pressure.");
  }

  if (eveningSoldSeats >= 300 && eveningShiftCount <= 5) {
    predictions.push("📈 Risiko for underbemanding i peak timer 18-22.");
  }

  const overtimeRisk = shifts.some((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 8;
  });

  if (overtimeRisk) {
    predictions.push(
      "📈 Høj sandsynlighed for overtime belastning i denne uge.",
    );
  }

  const totalSoldSeats = movies.reduce(
    (sum, movie) => sum + movie.soldSeats,
    0,
  );

  if (totalSoldSeats >= 500) {
    predictions.push("📈 Biografen forventes at få en travl dag.");
  }

  return predictions;
}

export function calculateAiLearningAnalytics(input: {
  movies: MovieShowing[];
  shifts: Shift[];
  staffingWarnings: string[];
  predictiveStaffing: string[];
}) {
  const emergencyEvents = input.movies.filter(
    (movie) => movie.soldSeats >= 200,
  ).length;

  const fatigueTrend = input.shifts.filter((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 8;
  }).length;

  const overtimeTrend = input.shifts.filter((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 10;
  }).length;

  const aiInterventions =
    input.staffingWarnings.length + input.predictiveStaffing.length;

  return {
    emergencyEvents,
    fatigueTrend,
    overtimeTrend,
    aiInterventions,
  };
}

export function calculateAiPatternInsights(input: {
  shifts: Shift[];
  staffingHeatmap: {
    risk: string;
  }[];
}) {
  const weekdayMap: Record<string, number> = {};
  const peakHourMap: Record<string, number> = {};

  input.shifts.forEach((shift) => {
    const start = new Date(shift.startTime);

    const weekday = start.toLocaleDateString("da-DK", {
      weekday: "long",
    });

    const hour = start.getHours();

    weekdayMap[weekday] = (weekdayMap[weekday] || 0) + 1;

    peakHourMap[hour] = (peakHourMap[hour] || 0) + 1;
  });

  const busiestDay = Object.entries(weekdayMap).sort((a, b) => b[1] - a[1])[0];

  const busiestHour = Object.entries(peakHourMap).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const highFatigueEmployees = input.staffingHeatmap.filter(
    (item) => item.risk === "HIGH",
  ).length;

  return {
    busiestDay: busiestDay?.[0] || "Ingen data",
    busiestDayCount: busiestDay?.[1] || 0,
    busiestHour: busiestHour?.[0] || "Ingen data",
    busiestHourCount: busiestHour?.[1] || 0,
    highFatigueEmployees,
  };
}
