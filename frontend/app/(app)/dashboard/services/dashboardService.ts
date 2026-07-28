import { apiFetch } from "@/app/lib/api";

import type {
  DashboardSourceKey,
  DashboardSourceStatus,
  DashboardSourceStatusMap,
  LeaveRequest,
  MovieShowing,
  Shift,
  ShiftTrade,
  TimeEntry,
} from "../types";

export type DashboardOverview = {
  shifts: Shift[];
  timeEntries: TimeEntry[];
  leaveRequests: LeaveRequest[];
  shiftTrades: ShiftTrade[];
  movies: MovieShowing[];
  sourceStatus: DashboardSourceStatusMap;
};

type DashboardDataAccess = {
  schedule: boolean;
  timeTracking: boolean;
  leave: boolean;
  shiftTrades: boolean;
};

type DashboardSourceResult<T> = {
  items: T[];
  status: DashboardSourceStatus;
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

async function ensureOk(
  response: Response,
  fallback: string,
) {
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, fallback),
    );
  }
}

async function readJsonArray<T>(
  response: Response,
  fallback: string,
): Promise<T[]> {
  try {
    const data = await response.json();
    if (Array.isArray(data)) {
      return data as T[];
    }
  } catch {}

  throw new Error(fallback);
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallback;
}

async function fetchArraySource<T>(
  enabled: boolean,
  endpoint: string,
  fallback: string,
): Promise<DashboardSourceResult<T>> {
  if (!enabled) {
    return {
      items: [],
      status: { state: "disabled" },
    };
  }

  try {
    const response = await apiFetch(endpoint);
    await ensureOk(response, fallback);

    return {
      items: await readJsonArray<T>(response, fallback),
      status: { state: "fresh" },
    };
  } catch (error) {
    return {
      items: [],
      status: {
        state: "unavailable",
        message: getErrorMessage(error, fallback),
      },
    };
  }
}

function createSourceStatus(
  entries: Array<
    readonly [DashboardSourceKey, DashboardSourceStatus]
  >,
): DashboardSourceStatusMap {
  return Object.fromEntries(entries) as DashboardSourceStatusMap;
}

export async function fetchDashboardOverview(
  input: {
    userId: number;
    date: string;
    cinemaId?: number;
    modules: DashboardDataAccess;
  },
): Promise<DashboardOverview> {
  const cinemaQueryParam = getCinemaQueryParam(
    input.cinemaId,
  );
  const personalTimeEnabled =
    input.modules.timeTracking &&
    input.cinemaId === undefined;
  const personalTimeEndpoint =
    `/time-entries/me-period?startDate=${encodeURIComponent(
      input.date,
    )}&endDate=${encodeURIComponent(input.date)}`;

  const [
    shifts,
    timeEntries,
    leaveRequests,
    shiftTrades,
    movies,
  ] = await Promise.all([
    fetchArraySource<Shift>(
      input.modules.schedule,
      appendQuery(
        `/shifts?date=${input.date}`,
        cinemaQueryParam,
      ),
      "Kunne ikke hente dagens vagter",
    ),
    fetchArraySource<TimeEntry>(
      personalTimeEnabled,
      personalTimeEndpoint,
      "Kunne ikke hente dine tidsregistreringer for i dag",
    ),
    fetchArraySource<LeaveRequest>(
      input.modules.leave,
      appendQuery(
        "/leave-requests",
        cinemaQueryParam,
      ),
      "Kunne ikke hente fraværsansøgninger",
    ),
    fetchArraySource<ShiftTrade>(
      input.modules.shiftTrades,
      appendQuery(
        "/shift-trades",
        cinemaQueryParam,
      ),
      "Kunne ikke hente vagtbytter",
    ),
    fetchArraySource<MovieShowing>(
      input.modules.schedule,
      appendQuery(
        `/movie-showings?date=${input.date}`,
        cinemaQueryParam,
      ),
      "Kunne ikke hente filmprogram",
    ),
  ]);

  return {
    shifts: shifts.items,
    timeEntries: timeEntries.items,
    leaveRequests: leaveRequests.items,
    shiftTrades: shiftTrades.items,
    movies: movies.items,
    sourceStatus: createSourceStatus([
      ["shifts", shifts.status],
      ["timeEntries", timeEntries.status],
      ["leaveRequests", leaveRequests.status],
      ["shiftTrades", shiftTrades.status],
      ["movies", movies.status],
    ]),
  };
}
