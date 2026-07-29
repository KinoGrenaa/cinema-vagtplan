import type {
  DashboardSourceKey,
  DashboardSourceStatusMap,
} from "../types";

export const DASHBOARD_SOURCE_LABELS: Record<
  DashboardSourceKey,
  string
> = {
  shifts: "Dagens vagter",
  timeEntries: "Dine timer i dag",
  leaveRequests: "Fraværsansøgninger",
  shiftTrades: "Vagtbytter",
  movies: "Filmprogram",
};

export const DASHBOARD_SOURCE_KEYS = Object.keys(
  DASHBOARD_SOURCE_LABELS,
) as DashboardSourceKey[];

export type DashboardSourceHistoryEntry = {
  lastSuccessfulAt: string | null;
  lastAttemptedAt: string | null;
  consecutiveFailures: number;
};

export type DashboardSourceHistoryMap = Record<
  DashboardSourceKey,
  DashboardSourceHistoryEntry
>;

export type DashboardSourceSummaryTone =
  | "fresh"
  | "degraded"
  | "unavailable"
  | "disabled";

export type DashboardSourceSummary = {
  enabled: number;
  fresh: number;
  stale: number;
  unavailable: number;
  degraded: number;
  oldestSuccessfulAt: string | null;
  text: string;
  tone: DashboardSourceSummaryTone;
};

export function createEmptyDashboardSourceHistory(): DashboardSourceHistoryMap {
  return DASHBOARD_SOURCE_KEYS.reduce(
    (result, key) => {
      result[key] = {
        lastSuccessfulAt: null,
        lastAttemptedAt: null,
        consecutiveFailures: 0,
      };
      return result;
    },
    {} as DashboardSourceHistoryMap,
  );
}

function getOldestTimestamp(values: Array<string | null>) {
  const validValues = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({
      value,
      timestamp: new Date(value).getTime(),
    }))
    .filter((entry) => Number.isFinite(entry.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);

  return validValues[0]?.value ?? null;
}

export function summarizeDashboardSources(
  sourceStatus: DashboardSourceStatusMap,
  sourceHistory: DashboardSourceHistoryMap,
): DashboardSourceSummary {
  const summary = DASHBOARD_SOURCE_KEYS.reduce(
    (result, key) => {
      const state = sourceStatus[key].state;
      if (state === "disabled") {
        return result;
      }

      result.enabled += 1;
      if (state === "fresh") result.fresh += 1;
      if (state === "stale") result.stale += 1;
      if (state === "unavailable") result.unavailable += 1;
      return result;
    },
    { enabled: 0, fresh: 0, stale: 0, unavailable: 0 },
  );

  const degraded = summary.stale + summary.unavailable;
  const oldestSuccessfulAt = getOldestTimestamp(
    DASHBOARD_SOURCE_KEYS.filter(
      (key) => sourceStatus[key].state !== "disabled",
    ).map((key) => sourceHistory[key].lastSuccessfulAt),
  );

  if (summary.enabled === 0) {
    return {
      ...summary,
      degraded,
      oldestSuccessfulAt,
      text: "Ingen aktive datakilder",
      tone: "disabled",
    };
  }

  if (summary.unavailable === summary.enabled) {
    return {
      ...summary,
      degraded,
      oldestSuccessfulAt,
      text: "Ingen datakilder er tilgængelige",
      tone: "unavailable",
    };
  }

  if (degraded > 0) {
    return {
      ...summary,
      degraded,
      oldestSuccessfulAt,
      text: `${summary.fresh} af ${summary.enabled} datakilder er aktuelle`,
      tone: "degraded",
    };
  }

  return {
    ...summary,
    degraded,
    oldestSuccessfulAt,
    text: `${summary.fresh} af ${summary.enabled} datakilder er aktuelle`,
    tone: "fresh",
  };
}

export function formatDashboardSourceTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(date);
}

export function formatDashboardSourceDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Copenhagen",
  }).format(date);
}

export function formatDashboardSourceAge(
  value: string | null,
  now = Date.now(),
) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - timestamp) / 1_000),
  );

  if (elapsedSeconds < 15) return "lige nu";
  if (elapsedSeconds < 60) return `for ${elapsedSeconds} sekunder siden`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes === 1) return "for 1 minut siden";
  if (elapsedMinutes < 60) return `for ${elapsedMinutes} minutter siden`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours === 1) return "for 1 time siden";
  if (elapsedHours < 24) return `for ${elapsedHours} timer siden`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1
    ? "for 1 dag siden"
    : `for ${elapsedDays} dage siden`;
}
