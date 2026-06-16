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
}): Promise<DashboardOverview> {
  const [
    shiftsResponse,
    timeEntriesResponse,
    leaveRequestsResponse,
    shiftTradesResponse,
    moviesResponse,
  ] = await Promise.all([
    apiFetch(`/shifts?date=${input.date}`),
    apiFetch(`/time-entries?userId=${input.userId}`),
    apiFetch("/leave-requests"),
    apiFetch("/shift-trades"),
    apiFetch(`/movie-showings?date=${input.date}`),
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
