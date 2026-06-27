import { apiFetch } from "../lib/api";
import type {
  LeaveRequest,
  MovieShowing,
  Shift,
  ShiftTrade,
  TimeEntry,
} from "../types/dashboard";

type DashboardOverview = {
  shifts: Shift[];
  timeEntries: TimeEntry[];
  leaveRequests: LeaveRequest[];
  shiftTrades: ShiftTrade[];
  movies: MovieShowing[];
};

function getCinemaQueryParam(cinemaId?: number) {
  if (!Number.isInteger(cinemaId) || !cinemaId || cinemaId <= 0) {
    return "";
  }

  return `cinemaId=${encodeURIComponent(String(cinemaId))}`;
}

function appendQuery(endpoint: string, queryParam: string) {
  if (!queryParam) {
    return endpoint;
  }

  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${queryParam}`;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.clone().json();

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

async function ensureOk(response: Response, fallback: string) {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }
}

async function safeJsonArray<T>(response: Response): Promise<T[]> {
  try {
    const data = await response.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

export async function fetchDashboardOverview(input: {
  userId: number;
  date: string;
  cinemaId?: number;
}): Promise<DashboardOverview> {
  const cinemaQueryParam = getCinemaQueryParam(input.cinemaId);

  const [
    shiftsResponse,
    timeEntriesResponse,
    leaveRequestsResponse,
    shiftTradesResponse,
    moviesResponse,
  ] = await Promise.all([
    apiFetch(appendQuery(`/shifts?date=${input.date}`, cinemaQueryParam)),
    apiFetch(
      appendQuery(`/time-entries?userId=${input.userId}`, cinemaQueryParam),
    ),
    apiFetch(appendQuery("/leave-requests", cinemaQueryParam)),
    apiFetch(appendQuery("/shift-trades", cinemaQueryParam)),
    apiFetch(appendQuery(`/movie-showings?date=${input.date}`, cinemaQueryParam)),
  ]);

  await Promise.all([
    ensureOk(shiftsResponse, "Kunne ikke hente dagens vagter"),
    ensureOk(timeEntriesResponse, "Kunne ikke hente dine tidsregistreringer"),
    ensureOk(leaveRequestsResponse, "Kunne ikke hente fraværsansøgninger"),
    ensureOk(shiftTradesResponse, "Kunne ikke hente vagtbytter"),
    ensureOk(moviesResponse, "Kunne ikke hente filmprogram"),
  ]);

  const [shifts, timeEntries, leaveRequests, shiftTrades, movies] =
    await Promise.all([
      safeJsonArray<Shift>(shiftsResponse),
      safeJsonArray<TimeEntry>(timeEntriesResponse),
      safeJsonArray<LeaveRequest>(leaveRequestsResponse),
      safeJsonArray<ShiftTrade>(shiftTradesResponse),
      safeJsonArray<MovieShowing>(moviesResponse),
    ]);

  return {
    shifts,
    timeEntries,
    leaveRequests,
    shiftTrades,
    movies,
  };
}
