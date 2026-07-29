"use client";

import {
  formatDashboardRefreshCountdown,
  formatDashboardRefreshTime,
  type DashboardAutoRefreshState,
} from "../../helpers/dashboardRefresh";
import type { DashboardSourceSummary } from "../../helpers/dashboardSourceHealth";

type DashboardRefreshControlsProps = {
  autoRefreshEnabled: boolean;
  autoRefreshState: DashboardAutoRefreshState;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  nextRefreshAt: string | null;
  secondsUntilRefresh: number | null;
  sourceSummary: DashboardSourceSummary;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
};

const stateToneClasses: Record<
  DashboardAutoRefreshState,
  string
> = {
  disabled:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  waiting:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  scheduled:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refreshing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "paused-hidden":
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  "paused-offline":
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const sourceToneClasses: Record<
  DashboardSourceSummary["tone"],
  string
> = {
  fresh: "text-green-700 dark:text-green-300",
  degraded: "text-amber-700 dark:text-amber-300",
  unavailable: "text-red-700 dark:text-red-300",
  disabled: "text-gray-500 dark:text-gray-400",
};

function getAutoRefreshStatusText(
  state: DashboardAutoRefreshState,
  secondsUntilRefresh: number | null,
) {
  if (state === "disabled") {
    return "Automatisk opdatering er slået fra";
  }
  if (state === "refreshing") {
    return "Henter nye oplysninger";
  }
  if (state === "paused-offline") {
    return "Sat på pause uden netværk";
  }
  if (state === "paused-hidden") {
    return "Sat på pause i baggrunden";
  }
  if (state === "waiting") {
    return "Starter efter første indlæsning";
  }
  return `Næste opdatering ${formatDashboardRefreshCountdown(
    secondsUntilRefresh,
  )}`;
}

export default function DashboardRefreshControls({
  autoRefreshEnabled,
  autoRefreshState,
  isRefreshing,
  lastUpdatedAt,
  nextRefreshAt,
  secondsUntilRefresh,
  sourceSummary,
  onAutoRefreshChange,
  onRefresh,
}: DashboardRefreshControlsProps) {
  const lastUpdatedTime =
    formatDashboardRefreshTime(lastUpdatedAt);
  const nextRefreshTime =
    formatDashboardRefreshTime(nextRefreshAt);
  const statusText = getAutoRefreshStatusText(
    autoRefreshState,
    secondsUntilRefresh,
  );

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() =>
            onAutoRefreshChange(!autoRefreshEnabled)
          }
          aria-pressed={autoRefreshEnabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
        >
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${
              autoRefreshEnabled
                ? "bg-green-500"
                : "bg-gray-400 dark:bg-gray-500"
            }`}
          />
          Automatisk: {autoRefreshEnabled ? "Til" : "Fra"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:shadow-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
        >
          {isRefreshing ? "Opdaterer..." : "Opdater nu"}
        </button>
      </div>
      <div className="flex flex-col items-start gap-1 text-xs text-gray-500 dark:text-gray-400 sm:items-end">
        <span
          aria-live="polite"
          className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${stateToneClasses[autoRefreshState]}`}
          title={
            nextRefreshTime && autoRefreshState === "scheduled"
              ? `Planlagt til kl. ${nextRefreshTime}`
              : undefined
          }
        >
          {statusText}
        </span>
        <span>
          {lastUpdatedTime
            ? `Senest opdateret kl. ${lastUpdatedTime}`
            : "Afventer første opdatering"}
        </span>
        <span
          className={`font-semibold ${sourceToneClasses[sourceSummary.tone]}`}
        >
          {sourceSummary.text}
        </span>
      </div>
    </div>
  );
}
