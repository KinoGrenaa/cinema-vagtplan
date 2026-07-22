import { apiFetch } from "@/app/lib/api";

import type {
  LeaveRequest,
  MovieShowing,
  Shift,
  ShiftTrade,
  TimeEntry,
} from "../types";

type DashboardOverview = {
  shifts: Shift[];
  timeEntries: TimeEntry[];
  leaveRequests: LeaveRequest[];
  shiftTrades: ShiftTrade[];
  movies: MovieShowing[];
};

type DashboardDataAccess = {
  schedule: boolean;
  timeTracking: boolean;
  leave: boolean;
  shiftTrades: boolean;
};

function getCinemaQueryParam(cinemaId?: number) {
  if (
    !Number.isInteger(cinemaId) ||
    !cinemaId ||
    cinemaId <= 0
  ) {
    return "";
  }

  return `cinemaId=${encodeURIComponent(
    String(cinemaId),
  )}`;
}

function appendQuery(
  endpoint: string,
  queryParam: string,
) {
  if (!queryParam) {
    return endpoint;
  }

  return `${endpoint}${
    endpoint.includes("?") ? "&" : "?"
  }${queryParam}`;
}

async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const data =
      await response.clone().json();

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {}

  try {
    const text = await response.text();

    if (text.trim()) {
      return text;
    }
  } catch {}

  return fallback;
}

async function ensureOk(
  response: Response,
  fallback: string,
) {
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        fallback,
      ),
    );
  }
}

async function safeJsonArray<T>(
  response: Response,
): Promise<T[]> {
  try {
    const data = await response.json();

    return Array.isArray(data)
      ? (data as T[])
      : [];
  } catch {
    return [];
  }
}

async function fetchArray<T>(
  enabled: boolean,
  endpoint: string,
  fallback: string,
): Promise<T[]> {
  if (!enabled) {
    return [];
  }

  const response = await apiFetch(endpoint);

  await ensureOk(response, fallback);

  return safeJsonArray<T>(response);
}

export async function fetchDashboardOverview(
  input: {
    userId: number;
    date: string;
    cinemaId?: number;
    modules: DashboardDataAccess;
  },
): Promise<DashboardOverview> {
  const cinemaQueryParam =
    getCinemaQueryParam(input.cinemaId);

  const [
    shifts,
    timeEntries,
    leaveRequests,
    shiftTrades,
    movies,
  ] = await Promise.all([
    fetchArray<Shift>(
      input.modules.schedule,
      appendQuery(
        `/shifts?date=${input.date}`,
        cinemaQueryParam,
      ),
      "Kunne ikke hente dagens vagter",
    ),
    fetchArray<TimeEntry>(
      input.modules.timeTracking,
      appendQuery(
        `/time-entries?userId=${input.userId}`,
        cinemaQueryParam,
      ),
      "Kunne ikke hente dine tidsregistreringer",
    ),
    fetchArray<LeaveRequest>(
      input.modules.leave,
      appendQuery(
        "/leave-requests",
        cinemaQueryParam,
      ),
      "Kunne ikke hente fraværsansøgninger",
    ),
    fetchArray<ShiftTrade>(
      input.modules.shiftTrades,
      appendQuery(
        "/shift-trades",
        cinemaQueryParam,
      ),
      "Kunne ikke hente vagtbytter",
    ),
    fetchArray<MovieShowing>(
      input.modules.schedule,
      appendQuery(
        `/movie-showings?date=${input.date}`,
        cinemaQueryParam,
      ),
      "Kunne ikke hente filmprogram",
    ),
  ]);

  return {
    shifts,
    timeEntries,
    leaveRequests,
    shiftTrades,
    movies,
  };
}
