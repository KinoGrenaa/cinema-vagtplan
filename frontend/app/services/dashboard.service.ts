import { apiFetch } from "../lib/api";

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

async function parseJson(response: Response, fallback: string) {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }

  try {
    return await response.json();
  } catch {
    throw new Error(fallback);
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
      parseJson(shiftsResponse, "Kunne ikke hente dagens vagter"),
      parseJson(timeEntriesResponse, "Kunne ikke hente tidsregistreringer"),
      parseJson(leaveRequestsResponse, "Kunne ikke hente fravær"),
      parseJson(shiftTradesResponse, "Kunne ikke hente vagtbytter"),
      parseJson(moviesResponse, "Kunne ikke hente filmprogram"),
    ]);

  return {
    shifts: Array.isArray(shifts) ? shifts : [],
    timeEntries: Array.isArray(timeEntries) ? timeEntries : [],
    leaveRequests: Array.isArray(leaveRequests) ? leaveRequests : [],
    shiftTrades: Array.isArray(shiftTrades) ? shiftTrades : [],
    movies: Array.isArray(movies) ? movies : [],
  };
}
