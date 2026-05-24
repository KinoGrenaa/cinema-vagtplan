import { apiFetch } from "../lib/api";

async function safeJson(response: Response) {
  try {
    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchDashboardOverview(input: {
  userId: number;
  date: string;
}) {
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

  const [shifts, timeEntries, leaveRequests, shiftTrades, movies] =
    await Promise.all([
      safeJson(shiftsResponse),
      safeJson(timeEntriesResponse),
      safeJson(leaveRequestsResponse),
      safeJson(shiftTradesResponse),
      safeJson(moviesResponse),
    ]);

  return {
    shifts: shifts ?? [],
    timeEntries: timeEntries ?? [],
    leaveRequests: leaveRequests ?? [],
    shiftTrades: shiftTrades ?? [],
    movies: movies ?? [],
  };
}
