"use client";

import { useEffect, useMemo, useState } from "react";

import {
  DASHBOARD_SOURCE_KEYS,
  DASHBOARD_SOURCE_LABELS,
  formatDashboardSourceAge,
  formatDashboardSourceDateTime,
  summarizeDashboardSources,
  type DashboardSourceHistoryMap,
} from "../../helpers/dashboardSourceHealth";
import type { DashboardSourceStatusMap } from "../../types";
import DashboardSourceBadge from "./DashboardSourceBadge";

type DashboardDataStatusProps = {
  sourceStatus: DashboardSourceStatusMap;
  sourceHistory: DashboardSourceHistoryMap;
};

const summaryToneClasses = {
  fresh:
    "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100",
  degraded:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  unavailable:
    "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
  disabled:
    "border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function DashboardDataStatus({
  sourceStatus,
  sourceHistory,
}: DashboardDataStatusProps) {
  const summary = useMemo(
    () =>
      summarizeDashboardSources(sourceStatus, sourceHistory),
    [sourceHistory, sourceStatus],
  );
  const [isExpanded, setIsExpanded] = useState(
    summary.degraded > 0,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (summary.degraded > 0) {
      setIsExpanded(true);
    }
  }, [summary.degraded]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const activeSources = DASHBOARD_SOURCE_KEYS.filter(
    (key) => sourceStatus[key].state !== "disabled",
  );

  if (activeSources.length === 0) {
    return null;
  }

  const oldestAge = formatDashboardSourceAge(
    summary.oldestSuccessfulAt,
    now,
  );

  return (
    <section
      aria-labelledby="dashboard-data-status-heading"
      className={`rounded-2xl border p-5 shadow-sm transition-colors ${summaryToneClasses[summary.tone]}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
            Datastatus
          </p>
          <h2
            id="dashboard-data-status-heading"
            className="mt-1 text-lg font-bold"
          >
            {summary.text}
          </h2>
          <p className="mt-1 text-sm leading-6 opacity-80">
            {summary.degraded > 0
              ? "Se hvilke oplysninger der er aktuelle, tidligere hentede eller utilgængelige."
              : oldestAge
                ? `Alle aktive kilder er aktuelle. Den ældste opdatering er ${oldestAge}.`
                : "Alle aktive datakilder er hentet uden fejl."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold shadow-sm dark:bg-gray-950/40">
            {summary.fresh} aktuelle
          </span>
          {summary.stale > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/70 dark:text-amber-200">
              {summary.stale} tidligere
            </span>
          )}
          {summary.unavailable > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 dark:bg-red-900/70 dark:text-red-200">
              {summary.unavailable} utilgængelige
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            aria-expanded={isExpanded}
            aria-controls="dashboard-data-status-details"
            className="inline-flex items-center rounded-xl border border-current/20 bg-white/70 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-gray-950/40 dark:hover:bg-gray-950 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
          >
            {isExpanded ? "Skjul detaljer" : "Vis detaljer"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          id="dashboard-data-status-details"
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {activeSources.map((key) => {
            const status = sourceStatus[key];
            const history = sourceHistory[key];
            const successfulAt =
              formatDashboardSourceDateTime(
                history.lastSuccessfulAt,
              );
            const attemptedAt =
              formatDashboardSourceDateTime(
                history.lastAttemptedAt,
              );
            const sourceAge = formatDashboardSourceAge(
              history.lastSuccessfulAt,
              now,
            );

            return (
              <article
                key={key}
                className="rounded-xl border border-current/10 bg-white/70 p-4 shadow-sm dark:bg-gray-950/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">
                    {DASHBOARD_SOURCE_LABELS[key]}
                  </h3>
                  <DashboardSourceBadge status={status} />
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                      Senest vellykket
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {successfulAt
                        ? `${successfulAt}${
                            sourceAge ? ` · ${sourceAge}` : ""
                          }`
                        : "Ingen vellykket hentning endnu"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide opacity-60">
                      Seneste forsøg
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {attemptedAt ?? "Afventer første forsøg"}
                    </dd>
                  </div>
                </dl>
                {history.consecutiveFailures > 0 && (
                  <p className="mt-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
                    {history.consecutiveFailures === 1
                      ? "Seneste forsøg mislykkedes"
                      : `${history.consecutiveFailures} forsøg i træk er mislykkedes`}
                  </p>
                )}
                {status.message && (
                  <p className="mt-2 text-xs leading-5 opacity-75">
                    {status.message}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
