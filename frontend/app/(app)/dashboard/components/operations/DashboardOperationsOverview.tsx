"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatHours } from "../../helpers/dashboardHelpers";
import {
  formatDashboardRefreshTime,
  type DashboardAutoRefreshState,
} from "../../helpers/dashboardRefresh";
import type { DashboardSourceSummary } from "../../helpers/dashboardSourceHealth";
import { isDashboardSourceReadable } from "../../helpers/dashboardSourcePresentation";
import {
  buildDashboardHorizonDaySummaries,
  formatDashboardHorizonDate,
  formatDashboardHorizonRange,
  getDashboardHorizonRange,
  MAX_DASHBOARD_HORIZON_DAYS,
  MIN_DASHBOARD_HORIZON_DAYS,
  summarizeDashboardHorizon,
  type DashboardOperationalWarning,
} from "../../helpers/dashboardOperationsHorizon";
import { useDashboardOperationsHorizon } from "../../hooks/useDashboardOperationsHorizon";
import type { DashboardWarningDecision } from "../../services/dashboardOperationsService";
import type { DashboardSourceStatusMap } from "../../types";
import DashboardWarningDecisionModal from "./DashboardWarningDecisionModal";
import DashboardWarningHistoryModal from "./DashboardWarningHistoryModal";

type OperationsStatusValue = "UNKNOWN" | "NORMAL" | "WARNING" | "CRITICAL";
type ModuleAccess = {
  schedule: boolean;
  leave: boolean;
  shiftTrades: boolean;
  payroll: boolean;
  staffingAi: boolean;
};

type DashboardOperationsOverviewProps = {
  date: string;
  liveOperationsStatus: OperationsStatusValue;
  sourceSummary: DashboardSourceSummary;
  sourceStatus: DashboardSourceStatusMap;
  todayPlannedHours: number;
  shiftCount: number;
  movieCount: number;
  soldSeatsToday: number;
  seatLoadPercent: number;
  pendingLeaveRequests: number;
  openShiftTrades: number;
  staffingWarningsCount: number;
  moduleAccess: ModuleAccess;
  hasAdministrativeAccess: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  autoRefreshEnabled: boolean;
  autoRefreshState: DashboardAutoRefreshState;
  errorMessage: string | null;
  onRefresh: () => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onShowComplete: () => void;
};

const buttonClass =
  "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400";

function getLatestDecisionMap(decisions: DashboardWarningDecision[]) {
  const latest = new Map<string, DashboardWarningDecision>();
  for (const decision of decisions) latest.set(decision.warningKey, decision);
  return latest;
}

function getDecisionHistoryMap(decisions: DashboardWarningDecision[]) {
  const history = new Map<string, DashboardWarningDecision[]>();

  for (const decision of decisions) {
    const current = history.get(decision.warningKey) ?? [];
    current.push(decision);
    history.set(decision.warningKey, current);
  }

  return history;
}

type DashboardWarningGroupItem = {
  warning: DashboardOperationalWarning;
  ignored: boolean;
  decision: DashboardWarningDecision | null;
};

type DashboardWarningDateGroup = {
  date: string;
  warnings: DashboardWarningGroupItem[];
};

function groupWarningsByDate(
  warnings: DashboardOperationalWarning[],
  latestDecisions: Map<string, DashboardWarningDecision>,
  includeIgnored: boolean,
): DashboardWarningDateGroup[] {
  const groups = new Map<string, DashboardWarningGroupItem[]>();

  for (const warning of warnings) {
    const decision = latestDecisions.get(warning.key) ?? null;
    const ignored = decision?.action === "IGNORED";

    if (ignored && !includeIgnored) continue;

    const current = groups.get(warning.date) ?? [];
    current.push({ warning, ignored, decision });
    groups.set(warning.date, current);
  }

  return Array.from(groups, ([date, items]) => ({ date, warnings: items })).sort(
    (left, right) => left.date.localeCompare(right.date),
  );
}

function summarizeWarningGroup(warnings: DashboardWarningGroupItem[]) {
  const activeWarnings = warnings
    .filter((item) => !item.ignored)
    .map((item) => item.warning);
  const ignoredCount = warnings.filter((item) => item.ignored).length;
  const unassigned = activeWarnings.filter(
    (warning) => warning.type === "UNASSIGNED_SHIFT",
  );
  const loadWarning = activeWarnings.find(
    (warning) => warning.type === "STAFFING_LOAD",
  );
  const labels: string[] = [];

  if (unassigned.length > 0) {
    labels.push(
      `${unassigned.length} ${
        unassigned.length === 1 ? "ubemandet vagt" : "ubemandede vagter"
      }`,
    );
  }
  if (loadWarning) labels.push("Høj belastning");
  if (ignoredCount > 0) {
    labels.push(
      `${ignoredCount} ${ignoredCount === 1 ? "ignoreret" : "ignorerede"}`,
    );
  }

  const firstActiveWarning = activeWarnings[0] ?? null;
  const firstWarning = warnings[0]?.warning ?? null;
  const secondary =
    loadWarning?.summary ??
    unassigned[0]?.summary ??
    firstActiveWarning?.summary ??
    firstWarning?.summary ??
    "";

  return {
    label: labels.join(" · "),
    secondary,
    activeCount: activeWarnings.length,
    ignoredCount,
  };
}

function getStatusContent(input: {
  loading: boolean;
  hasIssues: boolean;
  canAssess: boolean;
  issueDayCount: number;
  otherOpenCount: number;
}) {
  if (input.loading) {
    return {
      label: "Indlæser perioden",
      description: "Henter vagter, filmprogram og håndterede advarsler.",
      tone:
        "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
    };
  }
  if (!input.canAssess) {
    return {
      label: "Kan ikke vurderes fuldt ud",
      description: "En eller flere datakilder mangler. Se Fuld visning for detaljer.",
      tone:
        "border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
    };
  }
  if (input.hasIssues) {
    const parts: string[] = [];
    if (input.issueDayCount > 0) {
      parts.push(
        `${input.issueDayCount} ${
          input.issueDayCount === 1 ? "dag har" : "dage har"
        } forhold`,
      );
    }
    if (input.otherOpenCount > 0) {
      parts.push(
        `${input.otherOpenCount} øvrige ${
          input.otherOpenCount === 1 ? "opgave" : "opgaver"
        }`,
      );
    }
    return {
      label: "Kræver opmærksomhed",
      description: `${parts.join(" og ")} kræver stillingtagen.`,
      tone:
        "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
    };
  }
  return {
    label: "Ser godt ud",
    description:
      "Der er ingen kendte forhold i den valgte periode, som du mangler at tage stilling til.",
    tone:
      "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/50 dark:text-green-100",
  };
}

export default function DashboardOperationsOverview({
  date,
  sourceStatus,
  pendingLeaveRequests,
  openShiftTrades,
  moduleAccess,
  hasAdministrativeAccess,
  isRefreshing,
  lastUpdatedAt,
  autoRefreshEnabled,
  autoRefreshState,
  errorMessage,
  onRefresh,
  onAutoRefreshChange,
  onShowComplete,
}: DashboardOperationsOverviewProps) {
  const horizon = useDashboardOperationsHorizon({
    scheduleEnabled: moduleAccess.schedule,
    refreshToken: lastUpdatedAt,
  });
  const [draftDays, setDraftDays] = useState(String(horizon.horizonDays));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [expandedWarningGroup, setExpandedWarningGroup] = useState<string | null>(null);
  const [decisionWarning, setDecisionWarning] =
    useState<DashboardOperationalWarning | null>(null);
  const [decisionAction, setDecisionAction] =
    useState<"IGNORED" | "REOPENED">("IGNORED");
  const [historyWarning, setHistoryWarning] =
    useState<DashboardOperationalWarning | null>(null);

  useEffect(() => setDraftDays(String(horizon.horizonDays)), [horizon.horizonDays]);

  const range = useMemo(
    () => getDashboardHorizonRange(date, horizon.horizonDays),
    [date, horizon.horizonDays],
  );
  const daySummaries = useMemo(
    () =>
      buildDashboardHorizonDaySummaries(
        range.startDate,
        range.days,
        horizon.data.shifts,
        horizon.data.movies,
        horizon.data.loadWarningSettings,
      ),
    [
      horizon.data.loadWarningSettings,
      horizon.data.movies,
      horizon.data.shifts,
      range.days,
      range.startDate,
    ],
  );
  const summary = useMemo(
    () => summarizeDashboardHorizon(daySummaries),
    [daySummaries],
  );
  const latestDecisions = useMemo(
    () => getLatestDecisionMap(horizon.data.warningDecisions),
    [horizon.data.warningDecisions],
  );
  const decisionHistory = useMemo(
    () => getDecisionHistoryMap(horizon.data.warningDecisions),
    [horizon.data.warningDecisions],
  );
  const allWarnings = useMemo(
    () => daySummaries.flatMap((day) => day.warnings),
    [daySummaries],
  );
  const activeWarnings = useMemo(
    () =>
      allWarnings.filter(
        (warning) => latestDecisions.get(warning.key)?.action !== "IGNORED",
      ),
    [allWarnings, latestDecisions],
  );
  const ignoredWarnings = useMemo(
    () =>
      allWarnings.filter(
        (warning) => latestDecisions.get(warning.key)?.action === "IGNORED",
      ),
    [allWarnings, latestDecisions],
  );
  const activeGroups = useMemo(
    () => groupWarningsByDate(allWarnings, latestDecisions, false),
    [allWarnings, latestDecisions],
  );
  const visibleGroups = useMemo(
    () => groupWarningsByDate(allWarnings, latestDecisions, showIgnored),
    [allWarnings, latestDecisions, showIgnored],
  );

  const shiftsReadable = isDashboardSourceReadable(
    horizon.data.sourceStatus.shifts,
  );
  const moviesReadable = isDashboardSourceReadable(
    horizon.data.sourceStatus.movies,
  );
  const leaveReadable = isDashboardSourceReadable(sourceStatus.leaveRequests);
  const shiftTradesReadable = isDashboardSourceReadable(sourceStatus.shiftTrades);
  const canAssess =
    (!moduleAccess.schedule || (shiftsReadable && moviesReadable)) &&
    (!moduleAccess.leave || leaveReadable) &&
    (!moduleAccess.shiftTrades || shiftTradesReadable);
  const otherOpenCount =
    (moduleAccess.leave && leaveReadable ? pendingLeaveRequests : 0) +
    (moduleAccess.shiftTrades && shiftTradesReadable ? openShiftTrades : 0);
  const hasIssues = activeWarnings.length > 0 || otherOpenCount > 0;
  const status = getStatusContent({
    loading: horizon.loading,
    hasIssues,
    canAssess,
    issueDayCount: activeGroups.length,
    otherOpenCount,
  });

  const metrics = [
    { label: "Planlagte timer", value: shiftsReadable ? formatHours(summary.plannedHours) : "—" },
    { label: "Vagter", value: shiftsReadable ? summary.shiftCount : "—" },
    { label: "Forestillinger", value: moviesReadable ? summary.movieCount : "—" },
    { label: "Solgte billetter", value: moviesReadable ? summary.soldSeats : "—" },
    { label: "Belægning", value: moviesReadable ? `${summary.seatLoadPercent}%` : "—" },
  ];
  const shortcuts = [
    { href: "/schedule", label: "Vagtplan", enabled: moduleAccess.schedule },
    {
      href: "/shift-planning",
      label: "Planlæg vagter",
      enabled: moduleAccess.schedule && hasAdministrativeAccess,
    },
    {
      href: hasAdministrativeAccess ? "/leave-approval" : "/leave-requests",
      label: "Fravær",
      enabled: moduleAccess.leave,
    },
    { href: "/shift-trades", label: "Vagtbytte", enabled: moduleAccess.shiftTrades },
    { href: "/payroll", label: "Løn", enabled: moduleAccess.payroll && hasAdministrativeAccess },
  ].filter((shortcut) => shortcut.enabled);

  const effectiveLastUpdated = horizon.lastUpdatedAt ?? lastUpdatedAt;
  const lastUpdatedTime = formatDashboardRefreshTime(effectiveLastUpdated);
  const combinedError = saveError ?? horizon.errorMessage ?? errorMessage;
  const busy =
    isRefreshing || horizon.loading || horizon.refreshing || horizon.savingPreference;

  async function savePeriod() {
    setSaveError(null);
    try {
      await horizon.saveHorizonDays(Number(draftDays));
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Kunne ikke gemme perioden.",
      );
    }
  }

  function openDecision(
    warning: DashboardOperationalWarning,
    action: "IGNORED" | "REOPENED",
  ) {
    setDecisionWarning(warning);
    setDecisionAction(action);
  }

  async function confirmDecision(note: string | null) {
    if (!decisionWarning) return;
    try {
      await horizon.recordWarningDecision(decisionWarning, decisionAction, note);
      setDecisionWarning(null);
    } catch {}
  }

  function renderWarningGroups(groups: DashboardWarningDateGroup[]) {
    const hasActiveWarnings = groups.some((group) =>
      group.warnings.some((item) => !item.ignored),
    );
    const tone = hasActiveWarnings
      ? "border-orange-200 bg-white dark:border-orange-900 dark:bg-gray-900"
      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900";

    return (
      <div className={`overflow-hidden rounded-xl border ${tone}`}>
        {groups.map((group, index) => {
          const groupKey = group.date;
          const expanded = expandedWarningGroup === groupKey;
          const overview = summarizeWarningGroup(group.warnings);
          const ignoredOnly = overview.activeCount === 0;

          return (
            <div
              key={groupKey}
              className={index > 0 ? "border-t border-gray-200 dark:border-gray-800" : ""}
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() =>
                  setExpandedWarningGroup((current) =>
                    current === groupKey ? null : groupKey,
                  )
                }
                className={`grid w-full grid-cols-[minmax(7rem,auto)_1fr_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:hover:bg-gray-800/70 dark:focus-visible:ring-blue-400 ${
                  ignoredOnly
                    ? "bg-gray-50/70 text-gray-600 dark:bg-gray-950/30 dark:text-gray-400"
                    : ""
                }`}
              >
                <div className="font-bold capitalize text-gray-950 dark:text-white">
                  {formatDashboardHorizonDate(group.date)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {overview.label}
                  </div>
                  {overview.secondary ? (
                    <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {overview.secondary}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {group.warnings.length > 1 ? (
                    <span className="rounded-full bg-gray-950 px-2 py-0.5 text-xs font-bold text-white dark:bg-black">
                      {group.warnings.length}
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {expanded ? "Skjul" : "Vis"}
                  </span>
                  <span aria-hidden="true" className="text-gray-400">
                    {expanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {expanded ? (
                <div className="border-t border-gray-200 bg-gray-50/70 px-4 py-2 dark:border-gray-800 dark:bg-gray-950/35">
                  {group.warnings.map((warningItem, warningIndex) => {
                    const { warning, ignored } = warningItem;
                    const history = decisionHistory.get(warning.key) ?? [];

                    return (
                      <div
                        key={warning.key}
                        className={`py-3 ${
                          warningIndex > 0
                            ? "border-t border-gray-200 dark:border-gray-800"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-gray-950 dark:text-white">
                                {warning.label}
                              </div>
                              {ignored ? (
                                <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                  Ignoreret
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                              {warning.details}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Link href={warning.scheduleHref} className={buttonClass}>
                              Åbn vagtplan
                            </Link>
                            {history.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setHistoryWarning(warning)}
                                className={buttonClass}
                              >
                                Historik ({history.length})
                              </button>
                            ) : null}
                            {hasAdministrativeAccess ? (
                              <button
                                type="button"
                                disabled={horizon.savingDecisionKey === warning.key}
                                onClick={() =>
                                  openDecision(
                                    warning,
                                    ignored ? "REOPENED" : "IGNORED",
                                  )
                                }
                                className={buttonClass}
                              >
                                {ignored ? "Genåbn" : "Ignorer"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {formatDashboardHorizonRange(range.startDate, range.endDate)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
                  Kommende {horizon.horizonDays} dage
                </h1>
                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${status.tone}`}>
                  {status.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {status.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{lastUpdatedTime ? `Opdateret kl. ${lastUpdatedTime}` : "Afventer første opdatering"}</span>
                <span>
                  {autoRefreshState === "paused-offline"
                    ? "Automatisk opdatering er sat på pause uden netværk"
                    : autoRefreshEnabled
                      ? "Opdateres automatisk"
                      : "Automatisk opdatering er slået fra"}
                </span>
              </div>
            </div>

            <div className="flex max-w-full flex-col gap-2">
              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-950/50">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <span className="mb-1 block">Vis næste</span>
                  <input
                    type="number"
                    min={MIN_DASHBOARD_HORIZON_DAYS}
                    max={MAX_DASHBOARD_HORIZON_DAYS}
                    step={1}
                    value={draftDays}
                    onChange={(event) => setDraftDays(event.target.value)}
                    className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-semibold text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    aria-label="Antal kalenderdage i driftsoverblikket"
                  />
                </label>
                <span className="pb-2 text-xs text-gray-500 dark:text-gray-400">
                  kalenderdage inkl. i dag
                </span>
                <button
                  type="button"
                  onClick={() => void savePeriod()}
                  disabled={
                    horizon.savingPreference ||
                    Number(draftDays) === horizon.horizonDays ||
                    !Number.isInteger(Number(draftDays)) ||
                    Number(draftDays) < MIN_DASHBOARD_HORIZON_DAYS ||
                    Number(draftDays) > MAX_DASHBOARD_HORIZON_DAYS
                  }
                  className={buttonClass}
                >
                  {horizon.savingPreference ? "Gemmer..." : "Gem"}
                </button>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onAutoRefreshChange(!autoRefreshEnabled)}
                  aria-pressed={autoRefreshEnabled}
                  className={buttonClass}
                >
                  Auto {autoRefreshEnabled ? "til" : "fra"}
                </button>
                <button type="button" onClick={onRefresh} disabled={busy} className={buttonClass}>
                  {busy ? "Opdaterer..." : "Opdater"}
                </button>
                <button
                  type="button"
                  onClick={onShowComplete}
                  className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400"
                >
                  Fuld visning
                </button>
              </div>
            </div>
          </div>
        </section>

        {combinedError ? (
          <section role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {combinedError}
          </section>
        ) : null}

        <section aria-labelledby="dashboard-horizon-actions-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                Prioritet
              </p>
              <h2 id="dashboard-horizon-actions-heading" className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
                Kræver handling
              </h2>
            </div>
            {ignoredWarnings.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowIgnored((value) => !value)}
                className={buttonClass}
              >
                {showIgnored ? "Skjul ignorerede" : `Vis ignorerede (${ignoredWarnings.length})`}
              </button>
            ) : null}
          </div>

          {!horizon.loading && !canAssess ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
              Det kan ikke afgøres fuldt ud, om alle forhold er dækket. Se Fuld visning for datastatus.
            </div>
          ) : null}

          {!horizon.loading && visibleGroups.length > 0
            ? renderWarningGroups(visibleGroups)
            : !horizon.loading && canAssess && otherOpenCount === 0
              ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900 dark:border-green-900 dark:bg-green-950/35 dark:text-green-100">
                  Ingen kendte driftsadvarsler kræver stillingtagen i de kommende {horizon.horizonDays} dage.
                </div>
              )
              : horizon.loading
                ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-100">
                    Henter periodens åbne forhold...
                  </div>
                )
                : null}

          {moduleAccess.leave && leaveReadable && pendingLeaveRequests > 0 ? (
            <Link href={hasAdministrativeAccess ? "/leave-approval" : "/leave-requests"} className="mt-3 block rounded-xl border border-amber-200 bg-amber-50/70 p-4 font-semibold dark:border-amber-900 dark:bg-amber-950/25">
              {pendingLeaveRequests} {pendingLeaveRequests === 1 ? "fraværsansøgning afventer" : "fraværsansøgninger afventer"} →
            </Link>
          ) : null}
          {moduleAccess.shiftTrades && shiftTradesReadable && openShiftTrades > 0 ? (
            <Link href="/shift-trades" className="mt-3 block rounded-xl border border-blue-200 bg-blue-50/70 p-4 font-semibold dark:border-blue-900 dark:bg-blue-950/25">
              {openShiftTrades} {openShiftTrades === 1 ? "åbent vagtbytte" : "åbne vagtbytter"} →
            </Link>
          ) : null}

        </section>

        {moduleAccess.schedule ? (
          <section aria-labelledby="dashboard-horizon-metrics-heading">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Perioden</p>
              <h2 id="dashboard-horizon-metrics-heading" className="mt-1 text-xl font-bold text-gray-950 dark:text-white">Perioden i tal</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {metrics.map((metric) => (
                <Link key={metric.label} href="/schedule" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{metric.label}</div>
                  <div className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">{metric.value}</div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {shortcuts.length > 0 ? (
          <section aria-labelledby="dashboard-horizon-shortcuts-heading">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Genveje</p>
            <h2 id="dashboard-horizon-shortcuts-heading" className="sr-only">Genveje</h2>
            <div className="flex flex-wrap gap-2">
              {shortcuts.map((shortcut) => (
                <Link key={shortcut.href} href={shortcut.href} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/30">
                  {shortcut.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <DashboardWarningDecisionModal
        warning={decisionWarning}
        action={decisionAction}
        saving={
          decisionWarning !== null &&
          horizon.savingDecisionKey === decisionWarning.key
        }
        onClose={() => setDecisionWarning(null)}
        onConfirm={confirmDecision}
      />
      <DashboardWarningHistoryModal
        warning={historyWarning}
        decisions={
          historyWarning
            ? decisionHistory.get(historyWarning.key) ?? []
            : []
        }
        onClose={() => setHistoryWarning(null)}
      />
    </main>
  );
}
