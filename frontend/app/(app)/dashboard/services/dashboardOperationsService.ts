import { apiFetch } from "@/app/lib/api";

import type {
  DashboardSourceStatus,
  MovieShowing,
  Shift,
} from "../types";
import type {
  DashboardLoadWarningSettings,
  DashboardOperationalWarningType,
} from "../helpers/dashboardOperationsHorizon";

type OperationsRangeSourceStatus = {
  shifts: DashboardSourceStatus;
  movies: DashboardSourceStatus;
};

export type DashboardWarningDecision = {
  id: number;
  warningKey: string;
  warningType: DashboardOperationalWarningType;
  localDate: string;
  action: "IGNORED" | "REOPENED";
  note: string | null;
  warningLabel: string;
  warningDetails: string | null;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
};

export type DashboardOperationsRangeData = {
  shifts: Shift[];
  movies: MovieShowing[];
  sourceStatus: OperationsRangeSourceStatus;
  loadWarningSettings: DashboardLoadWarningSettings;
  warningDecisions: DashboardWarningDecision[];
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.clone().json();
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.message)) return data.message.join("\n");
  } catch {}
  return fallback;
}

async function readArraySource<T>(
  enabled: boolean,
  endpoint: string,
  fallback: string,
): Promise<{ items: T[]; status: DashboardSourceStatus }> {
  if (!enabled) {
    return { items: [], status: { state: "disabled" } };
  }

  try {
    const response = await apiFetch(endpoint);
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, fallback));
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(fallback);
    return { items: data as T[], status: { state: "fresh" } };
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

async function fetchWarningContext(
  cinemaId: number,
  startDate: string,
  endDate: string,
) {
  const [cinemaResponse, decisionsResponse] = await Promise.all([
    apiFetch(`/cinemas/${cinemaId}`),
    apiFetch(
      `/cinemas/${cinemaId}/dashboard-warning-decisions?startDate=${encodeURIComponent(
        startDate,
      )}&endDate=${encodeURIComponent(endDate)}`,
    ),
  ]);

  if (!cinemaResponse.ok) {
    throw new Error(
      await readErrorMessage(
        cinemaResponse,
        "Kunne ikke hente biografens belastningsregel",
      ),
    );
  }
  if (!decisionsResponse.ok) {
    throw new Error(
      await readErrorMessage(
        decisionsResponse,
        "Kunne ikke hente håndterede driftsadvarsler",
      ),
    );
  }

  const cinema = await cinemaResponse.json();
  const decisions = await decisionsResponse.json();

  return {
    loadWarningSettings: {
      enabled: cinema?.staffingLoadWarningEnabled === true,
      minSoldSeats: Number.isInteger(cinema?.staffingLoadWarningMinSoldSeats)
        ? cinema.staffingLoadWarningMinSoldSeats
        : 150,
      maxTicketsPerEmployee: Number.isInteger(
        cinema?.staffingLoadWarningMaxTicketsPerEmployee,
      )
        ? cinema.staffingLoadWarningMaxTicketsPerEmployee
        : 60,
      version:
        Number.isInteger(cinema?.staffingLoadWarningVersion) &&
        cinema.staffingLoadWarningVersion > 0
          ? cinema.staffingLoadWarningVersion
          : 1,
    } satisfies DashboardLoadWarningSettings,
    warningDecisions: Array.isArray(decisions)
      ? (decisions as DashboardWarningDecision[])
      : [],
  };
}

export async function fetchDashboardOperationsRange(input: {
  startDate: string;
  endDate: string;
  cinemaId: number;
  scheduleEnabled: boolean;
}): Promise<DashboardOperationsRangeData> {
  const range =
    `startDate=${encodeURIComponent(input.startDate)}` +
    `&endDate=${encodeURIComponent(input.endDate)}` +
    `&cinemaId=${encodeURIComponent(String(input.cinemaId))}`;

  const [shifts, movies, warningContext] = await Promise.all([
    readArraySource<Shift>(
      input.scheduleEnabled,
      `/shifts/range?${range}`,
      "Kunne ikke hente vagter for den valgte periode",
    ),
    readArraySource<MovieShowing>(
      input.scheduleEnabled,
      `/movie-showings/range?${range}`,
      "Kunne ikke hente filmprogram for den valgte periode",
    ),
    fetchWarningContext(input.cinemaId, input.startDate, input.endDate),
  ]);

  return {
    shifts: shifts.items,
    movies: movies.items,
    sourceStatus: {
      shifts: shifts.status,
      movies: movies.status,
    },
    ...warningContext,
  };
}

export async function saveDashboardWarningDecision(
  cinemaId: number,
  input: {
    warningKey: string;
    warningType: DashboardOperationalWarningType;
    localDate: string;
    action: "IGNORED" | "REOPENED";
    note?: string | null;
  },
) {
  const response = await apiFetch(
    `/cinemas/${cinemaId}/dashboard-warning-decisions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke håndtere advarslen"),
    );
  }

  return response.json() as Promise<DashboardWarningDecision>;
}

export async function fetchDashboardHorizonPreference() {
  const response = await apiFetch("/users/me/dashboard-horizon");
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke hente dashboardperioden"),
    );
  }
  const data = await response.json();
  return data?.dashboardHorizonDays;
}

export async function saveDashboardHorizonPreference(days: number) {
  const response = await apiFetch("/users/me/dashboard-horizon", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Kunne ikke gemme dashboardperioden"),
    );
  }
  return response.json() as Promise<{ dashboardHorizonDays: number }>;
}
