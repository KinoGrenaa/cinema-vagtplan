"use client";

import {
  DASHBOARD_SOURCE_KEYS,
  DASHBOARD_SOURCE_LABELS,
  formatDashboardSourceDateTime,
  type DashboardSourceHistoryMap,
} from "../../helpers/dashboardSourceHealth";
import type {
  DashboardSourceKey,
  DashboardSourceStatusMap,
} from "../../types";

type DashboardDataCoverageProps = {
  sourceStatus: DashboardSourceStatusMap;
  sourceHistory: DashboardSourceHistoryMap;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
};

function getFailureText(count: number) {
  if (count <= 0) return null;
  if (count === 1) return "Seneste forsøg mislykkedes.";
  return `${count} forsøg i træk er mislykkedes.`;
}

export default function DashboardDataCoverage({
  sourceStatus,
  sourceHistory,
  onRefresh,
  isRefreshing,
  autoRefreshEnabled,
}: DashboardDataCoverageProps) {
  const affectedSources = DASHBOARD_SOURCE_KEYS.filter(
    (key) =>
      sourceStatus[key].state === "stale" ||
      sourceStatus[key].state === "unavailable",
  );

  if (affectedSources.length === 0) {
    return null;
  }

  const staleCount = affectedSources.filter(
    (key) => sourceStatus[key].state === "stale",
  ).length;
  const unavailableCount =
    affectedSources.length - staleCount;

  return (
    <section
      aria-labelledby="dashboard-data-coverage-heading"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm transition-colors dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Delvist opdateret
          </p>
          <h2
            id="dashboard-data-coverage-heading"
            className="mt-1 text-lg font-bold"
          >
            Nogle oplysninger kunne ikke opdateres
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900 dark:text-amber-100/90">
            De dele, der kunne hentes, er opdateret. Tidligere data
            bevares, når de findes, så en enkelt fejl ikke fjerner hele
            driftsoverblikket.
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900 dark:text-amber-100/90">
            {autoRefreshEnabled
              ? "Dashboardet prøver automatisk igen ved næste opdatering."
              : "Automatisk opdatering er slået fra. Brug knappen for at prøve igen."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-amber-300 disabled:text-amber-700 disabled:shadow-none dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-amber-950 dark:disabled:bg-amber-900 dark:disabled:text-amber-300"
        >
          {isRefreshing
            ? "Prøver igen..."
            : "Prøv manglende data igen"}
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {affectedSources.map((key: DashboardSourceKey) => {
          const status = sourceStatus[key];
          const history = sourceHistory[key];
          const isStale = status.state === "stale";
          const lastSuccessfulAt =
            formatDashboardSourceDateTime(
              history.lastSuccessfulAt,
            );
          const lastAttemptedAt =
            formatDashboardSourceDateTime(
              history.lastAttemptedAt,
            );
          const failureText = getFailureText(
            history.consecutiveFailures,
          );

          return (
            <div
              key={key}
              className="rounded-xl border border-amber-200/80 bg-white/70 p-4 dark:border-amber-900/70 dark:bg-gray-950/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">
                  {DASHBOARD_SOURCE_LABELS[key]}
                </p>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  {isStale
                    ? "Senest kendte"
                    : "Ikke tilgængelig"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-5 text-amber-900 dark:text-amber-100/90">
                {isStale
                  ? "Tidligere hentede oplysninger vises fortsat."
                  : "Denne del er tom, indtil oplysningerne kan hentes."}
              </p>
              <dl className="mt-3 space-y-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
                <div>
                  <dt className="font-semibold">Senest vellykket</dt>
                  <dd>
                    {lastSuccessfulAt ??
                      "Ingen vellykket hentning endnu"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Seneste forsøg</dt>
                  <dd>
                    {lastAttemptedAt ?? "Afventer første forsøg"}
                  </dd>
                </div>
              </dl>
              {failureText && (
                <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                  {failureText}
                </p>
              )}
              {status.message && (
                <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  {status.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
        {staleCount > 0 && unavailableCount > 0
          ? `${staleCount} datakilde${
              staleCount === 1 ? "" : "r"
            } viser tidligere data, og ${unavailableCount} kunne ikke hentes.`
          : staleCount > 0
            ? `${staleCount} datakilde${
                staleCount === 1 ? "" : "r"
              } viser tidligere data.`
            : `${unavailableCount} datakilde${
                unavailableCount === 1 ? "" : "r"
              } kunne ikke hentes.`}
      </p>
    </section>
  );
}
