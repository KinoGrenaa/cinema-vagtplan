import {
  formatCopenhagenWeekday,
  getCopenhagenHour,
} from "@/app/utils/dateTime";

import type {
  MovieShowing,
  Shift,
  StaffingHealth,
  TimeEntry,
} from "../types";

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
    warnings.push("Der er meget lange vagter i dagens plan.");
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

  const movieDataAvailable = movies.length > 0;
  let staffingHealth: StaffingHealth = movieDataAvailable
    ? "STABLE"
    : "UNKNOWN";

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
    movieDataAvailable,
    staffingHealth,
  };
}

export function calculateOperationalRecommendations(input: {
  staffingHealth: StaffingHealth;
  highFatigueEmployees: number;
  moviePressure: number;
  activeShiftCount: number;
  movieDataAvailable: boolean;
}) {
  const recommendations: string[] = [];

  if (!input.movieDataAvailable) {
    recommendations.push(
      "ℹ️ Filmprogrammet er tomt eller ikke tilgængeligt. Filmrelateret drift kan ikke vurderes.",
    );
  }

  if (input.staffingHealth === "HIGH_PRESSURE") {
    recommendations.push(
      "🤖 Overvej ekstra bemanding i de travleste tidsrum.",
    );
  }

  if (input.staffingHealth === "CRITICAL") {
    recommendations.push(
      "🚨 Der er registreret kritisk bemandingspres. Hurtig handling anbefales.",
    );
  }

  if (input.highFatigueEmployees >= 3) {
    recommendations.push(
      "🤖 Flere lange vagter øger belastningen. Overvej at fordele arbejdet anderledes.",
    );
  }

  if (input.movieDataAvailable && input.moviePressure >= 500) {
    recommendations.push(
      "🤖 Mange solgte billetter kan øge presset i foyer og billetsalg.",
    );
  }

  if (
    input.movieDataAvailable &&
    input.activeShiftCount <= 3 &&
    input.moviePressure >= 300
  ) {
    recommendations.push("🚨 Risiko for underbemanding registreret.");
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "✅ Den automatiske vurdering viser ingen aktuelle driftsproblemer.",
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
  movieDataAvailable: boolean;
}): "UNKNOWN" | "NORMAL" | "WARNING" | "CRITICAL" {
  let status: "UNKNOWN" | "NORMAL" | "WARNING" | "CRITICAL" =
    input.movieDataAvailable ? "NORMAL" : "UNKNOWN";

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

    const hour = getCopenhagenHour(movie.startTime);

    return hour >= 18 && hour <= 22;
  });

  const eveningSoldSeats = eveningMovies.reduce(
    (sum, movie) => sum + movie.soldSeats,
    0,
  );

  const eveningShiftCount = shifts.filter((shift) => {
    const hour = getCopenhagenHour(shift.startTime);

    return hour >= 18 && hour <= 22;
  }).length;

  if (eveningSoldSeats >= 200 && eveningShiftCount <= 4) {
    predictions.push("📈 Der forventes højt bemandingspres i aftentimerne.");
  }

  if (eveningSoldSeats >= 300 && eveningShiftCount <= 5) {
    predictions.push("📈 Der er risiko for underbemanding mellem kl. 18 og 22.");
  }

  const overtimeRisk = shifts.some((shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 8;
  });

  if (overtimeRisk) {
    predictions.push(
      "📈 Lange vagter kan give øget belastning.",
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

    const weekday = formatCopenhagenWeekday(start);
    const hour = getCopenhagenHour(start);

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
