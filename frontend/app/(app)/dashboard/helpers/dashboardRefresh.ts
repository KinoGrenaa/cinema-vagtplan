export const DASHBOARD_AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export const DASHBOARD_AUTO_REFRESH_STORAGE_KEY =
  "dashboardAutoRefreshEnabled";

export type DashboardAutoRefreshState =
  | "disabled"
  | "waiting"
  | "scheduled"
  | "refreshing"
  | "paused-hidden"
  | "paused-offline";

function getCopenhagenDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Copenhagen",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function isDashboardUpdateFromPreviousDay(
  lastUpdatedAt: string | null,
) {
  if (!lastUpdatedAt) {
    return false;
  }

  return (
    getCopenhagenDateKey(lastUpdatedAt) !==
    getCopenhagenDateKey(new Date())
  );
}

export function getNextDashboardRefreshAt(
  lastUpdatedAt: string | null,
) {
  if (!lastUpdatedAt) {
    return null;
  }

  const value = new Date(lastUpdatedAt).getTime();
  if (!Number.isFinite(value)) {
    return null;
  }

  return new Date(
    value + DASHBOARD_AUTO_REFRESH_INTERVAL_MS,
  ).toISOString();
}

export function getSecondsUntilDashboardRefresh(
  nextRefreshAt: string | null,
  now: number,
) {
  if (!nextRefreshAt) {
    return null;
  }

  const value = new Date(nextRefreshAt).getTime();
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.ceil((value - now) / 1000));
}

export function formatDashboardRefreshCountdown(
  seconds: number | null,
) {
  if (seconds === null) {
    return "efter første opdatering";
  }
  if (seconds <= 5) {
    return "om få sekunder";
  }
  if (seconds < 60) {
    return `om ${seconds} sekunder`;
  }

  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "om 1 minut" : `om ${minutes} minutter`;
}

export function formatDashboardRefreshTime(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}
