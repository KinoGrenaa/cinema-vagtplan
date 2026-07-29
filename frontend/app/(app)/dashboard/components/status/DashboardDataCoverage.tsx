"use client";

import type {
  DashboardSourceKey,
  DashboardSourceStatusMap,
} from "../../types";

const SOURCE_LABELS: Record<DashboardSourceKey, string> = {
  shifts: "Dagens vagter",
  timeEntries: "Dine timer i dag",
  leaveRequests: "Fraværsansøgninger",
  shiftTrades: "Vagtbytter",
  movies: "Filmprogram",
};

const SOURCE_KEYS = Object.keys(
  SOURCE_LABELS,
) as DashboardSourceKey[];
type DashboardDataCoverageProps = {
  sourceStatus: DashboardSourceStatusMap;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
};

export default function DashboardDataCoverage({
  sourceStatus,
  onRefresh,
  isRefreshing,
  autoRefreshEnabled,
}: DashboardDataCoverageProps) {
  const affectedSources = SOURCE_KEYS.filter(
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
        {affectedSources.map((key) => {
          const status = sourceStatus[key];
          const isStale = status.state === "stale";
          return (
            <div
              key={key}
              className="rounded-xl border border-amber-200/80 bg-white/70 p-4 dark:border-amber-900/70 dark:bg-gray-950/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">
                  {SOURCE_LABELS[key]}
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
