import {
  calculatePlannedHours,
  calculateSoldSeats,
} from "./dashboardAnalytics";
import type {
  MovieShowing,
  Shift,
} from "../types";

export const DEFAULT_DASHBOARD_HORIZON_DAYS = 10;
export const MIN_DASHBOARD_HORIZON_DAYS = 1;
export const MAX_DASHBOARD_HORIZON_DAYS = 30;

export type DashboardLoadWarningSettings = {
  enabled: boolean;
  minSoldSeats: number;
  maxTicketsPerEmployee: number;
  version: number;
};

export type DashboardOperationalWarningType =
  | "UNASSIGNED_SHIFT"
  | "STAFFING_LOAD";

export type DashboardOperationalWarning = {
  key: string;
  type: DashboardOperationalWarningType;
  date: string;
  label: string;
  summary: string;
  details: string;
  scheduleHref: string;
};

const copenhagenDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const copenhagenTimeFormatter = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function normalizeDashboardHorizonDays(
  value: unknown,
  fallback = DEFAULT_DASHBOARD_HORIZON_DAYS,
) {
  const days = Number(value);

  if (
    !Number.isInteger(days) ||
    days < MIN_DASHBOARD_HORIZON_DAYS ||
    days > MAX_DASHBOARD_HORIZON_DAYS
  ) {
    return fallback;
  }

  return days;
}

export function addCalendarDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));

  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getDashboardHorizonRange(
  startDate: string,
  days: number,
) {
  const normalizedDays = normalizeDashboardHorizonDays(days);

  return {
    startDate,
    endDate: addCalendarDays(startDate, normalizedDays - 1),
    days: normalizedDays,
  };
}

function toUtcNoon(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function formatDashboardHorizonDate(dateKey: string) {
  return new Intl.DateTimeFormat("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Copenhagen",
  }).format(toUtcNoon(dateKey));
}

export function formatDashboardHorizonRange(
  startDate: string,
  endDate: string,
) {
  const formatter = new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Copenhagen",
  });

  return `${formatter.format(toUtcNoon(startDate))} – ${formatter.format(
    toUtcNoon(endDate),
  )}`;
}

function getCopenhagenDateKey(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : copenhagenDateKeyFormatter.format(date);
}

function formatShiftTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : copenhagenTimeFormatter.format(date);
}

function createUnassignedShiftWarning(
  date: string,
  shift: Shift,
): DashboardOperationalWarning {
  const name = shift.jobFunction?.name?.trim() || "Vagt";
  const start = formatShiftTime(shift.startTime);
  const end = formatShiftTime(shift.endTime);

  return {
    key: `UNASSIGNED_SHIFT:${shift.id}:${date}`,
    type: "UNASSIGNED_SHIFT",
    date,
    label: `${name} er ubemandet`,
    summary: start && end ? `${name} · ${start}–${end}` : name,
    details:
      start && end
        ? `${start}–${end} · Vagten er ikke tildelt en medarbejder.`
        : "Vagten er ikke tildelt en medarbejder.",
    scheduleHref: `/schedule?date=${date}`,
  };
}

function createLoadWarning(
  date: string,
  assignedEmployeeCount: number,
  soldSeats: number,
  settings: DashboardLoadWarningSettings,
): DashboardOperationalWarning | null {
  if (
    !settings.enabled ||
    assignedEmployeeCount <= 0 ||
    soldSeats < settings.minSoldSeats
  ) {
    return null;
  }

  const ticketsPerEmployee = soldSeats / assignedEmployeeCount;

  if (ticketsPerEmployee <= settings.maxTicketsPerEmployee) {
    return null;
  }

  return {
    key: `STAFFING_LOAD:${date}:v${settings.version}`,
    type: "STAFFING_LOAD",
    date,
    label: "Høj forventet belastning",
    summary: `${soldSeats} billetter · ${assignedEmployeeCount} ${
      assignedEmployeeCount === 1 ? "medarbejder" : "medarbejdere"
    }`,
    details:
      `${soldSeats} solgte billetter og ${assignedEmployeeCount} planlagte medarbejdere ` +
      `(${Math.round(ticketsPerEmployee)} pr. medarbejder). Din grænse er ` +
      `${settings.maxTicketsPerEmployee}.`,
    scheduleHref: `/schedule?date=${date}`,
  };
}

export type DashboardHorizonDaySummary = {
  date: string;
  shiftCount: number;
  plannedHours: number;
  movieCount: number;
  soldSeats: number;
  totalSeats: number;
  seatLoadPercent: number;
  warnings: DashboardOperationalWarning[];
};

export function buildDashboardHorizonDaySummaries(
  startDate: string,
  days: number,
  shifts: Shift[],
  movies: MovieShowing[],
  loadWarningSettings: DashboardLoadWarningSettings,
): DashboardHorizonDaySummary[] {
  const normalizedDays = normalizeDashboardHorizonDays(days);

  return Array.from({ length: normalizedDays }, (_, index) => {
    const date = addCalendarDays(startDate, index);
    const dayShifts = shifts.filter(
      (shift) => getCopenhagenDateKey(shift.startTime) === date,
    );
    const dayMovies = movies.filter(
      (movie) => getCopenhagenDateKey(movie.startTime) === date,
    );
    const assignedEmployeeIds = new Set(
      dayShifts
        .map((shift) => shift.userId)
        .filter(
          (userId): userId is number =>
            Number.isInteger(userId) && Number(userId) > 0,
        ),
    );
    const unassignedWarnings = dayShifts
      .filter((shift) => shift.userId === null)
      .map((shift) => createUnassignedShiftWarning(date, shift));
    const soldSeats = calculateSoldSeats(dayMovies);
    const totalSeats = dayMovies.reduce(
      (sum, movie) => sum + movie.soldSeats + movie.freeSeats,
      0,
    );
    const loadWarning = createLoadWarning(
      date,
      assignedEmployeeIds.size,
      soldSeats,
      loadWarningSettings,
    );

    return {
      date,
      shiftCount: dayShifts.length,
      plannedHours: calculatePlannedHours(dayShifts),
      movieCount: dayMovies.length,
      soldSeats,
      totalSeats,
      seatLoadPercent:
        totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0,
      warnings: loadWarning
        ? [...unassignedWarnings, loadWarning]
        : unassignedWarnings,
    };
  });
}

export function summarizeDashboardHorizon(
  daySummaries: DashboardHorizonDaySummary[],
) {
  const totals = daySummaries.reduce(
    (result, day) => {
      result.shiftCount += day.shiftCount;
      result.plannedHours += day.plannedHours;
      result.movieCount += day.movieCount;
      result.soldSeats += day.soldSeats;
      result.totalSeats += day.totalSeats;
      return result;
    },
    {
      shiftCount: 0,
      plannedHours: 0,
      movieCount: 0,
      soldSeats: 0,
      totalSeats: 0,
    },
  );

  return {
    ...totals,
    seatLoadPercent:
      totals.totalSeats > 0
        ? Math.round((totals.soldSeats / totals.totalSeats) * 100)
        : 0,
  };
}
