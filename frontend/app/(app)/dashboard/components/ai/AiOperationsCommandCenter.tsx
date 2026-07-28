import Link from "next/link";

import { cleanDashboardInsight } from "../../helpers/dashboardPresentation";
import {
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type StaffingHealth =
  | "UNKNOWN"
  | "STABLE"
  | "HIGH_PRESSURE"
  | "CRITICAL";

type OperationsHealth = {
  staffingHealth: StaffingHealth;
  activeShiftCount: number;
  highFatigueEmployees: number;
  moviePressure: number;
  movieDataAvailable: boolean;
};

type Props = {
  operationsHealth: OperationsHealth;
  operationalRecommendations: string[];
  shiftsSourceStatus: DashboardSourceStatus;
  moviesSourceStatus: DashboardSourceStatus;
  hasAdministrativeAccess: boolean;
};

const staffingHealthLabels: Record<StaffingHealth, string> = {
  UNKNOWN: "Kan ikke vurderes",
  STABLE: "Stabil",
  HIGH_PRESSURE: "Højt pres",
  CRITICAL: "Kritisk",
};

type AssessmentMetricProps = {
  label: string;
  value: string | number;
  status?: DashboardSourceStatus;
};

function AssessmentMetric({
  label,
  value,
  status,
}: AssessmentMetricProps) {
  const readable = !status || isDashboardSourceReadable(status);

  return (
    <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-cyan-800 dark:text-cyan-300">
          {label}
        </div>
        {status && (
          <DashboardSourceBadge status={status} hideWhenFresh />
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-cyan-950 dark:text-cyan-100">
        {readable ? value : "—"}
      </div>
    </div>
  );
}

export default function AiOperationsCommandCenter({
  operationsHealth,
  operationalRecommendations,
  shiftsSourceStatus,
  moviesSourceStatus,
  hasAdministrativeAccess,
}: Props) {
  const planningHref = hasAdministrativeAccess
    ? "/shift-planning"
    : "/schedule";
  const shiftsReadable = isDashboardSourceReadable(
    shiftsSourceStatus,
  );
  const moviesReadable = isDashboardSourceReadable(
    moviesSourceStatus,
  );
  const assessmentReadable = shiftsReadable || moviesReadable;
  const hasStaleData =
    isDashboardSourceStale(shiftsSourceStatus) ||
    isDashboardSourceStale(moviesSourceStatus);
  const assessmentStatus = !shiftsReadable
    ? "UNKNOWN"
    : operationsHealth.staffingHealth;

  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm dark:border-cyan-900 dark:bg-cyan-950/30">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-cyan-950 dark:text-cyan-100">
              Samlet driftsvurdering
            </h3>
            <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
              Regelbaseret
            </span>
            {hasStaleData && (
              <DashboardSourceBadge status={{ state: "stale" }} />
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-cyan-900/75 dark:text-cyan-100/75">
            Et øjebliksbillede af dagens bemanding, vagtlængder og billetbelastning.
          </p>
        </div>
        <Link
          href={planningHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold text-cyan-900 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 dark:border-cyan-800 dark:bg-gray-950 dark:text-cyan-100 dark:hover:border-cyan-600 dark:hover:bg-cyan-950 dark:focus-visible:ring-cyan-400 dark:focus-visible:ring-offset-gray-950"
        >
          {hasAdministrativeAccess
            ? "Gennemgå vagtplanlægning"
            : "Gennemgå dagens vagtplan"}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {!assessmentReadable && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Vagtplanen og filmprogrammet kunne ikke hentes. Den samlede driftsvurdering kan derfor ikke beregnes.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AssessmentMetric
          label="Bemandingssituation"
          value={staffingHealthLabels[assessmentStatus]}
          status={shiftsSourceStatus}
        />
        <AssessmentMetric
          label="Vagter i dag"
          value={operationsHealth.activeShiftCount}
          status={shiftsSourceStatus}
        />
        <AssessmentMetric
          label="Vagter på mindst 8 timer"
          value={operationsHealth.highFatigueEmployees}
          status={shiftsSourceStatus}
        />
        <AssessmentMetric
          label="Solgte billetter i programmet"
          value={operationsHealth.moviePressure}
          status={moviesSourceStatus}
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-lg font-bold text-cyan-950 dark:text-cyan-100">
            Hvad bør kontrolleres?
          </h4>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-800 dark:bg-gray-950 dark:text-cyan-200">
            {assessmentReadable
              ? `${operationalRecommendations.length} forhold`
              : "Kan ikke vurderes"}
          </span>
        </div>
        {assessmentReadable ? (
          <ol className="space-y-3">
            {operationalRecommendations.map((recommendation, index) => (
              <li
                key={`${index}-${recommendation}`}
                className="flex gap-3 rounded-xl border border-cyan-200 bg-white p-4 text-sm leading-6 text-cyan-950 dark:border-cyan-900 dark:bg-gray-950 dark:text-cyan-100"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                  {index + 1}
                </span>
                <span>{cleanDashboardInsight(recommendation)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-cyan-200 bg-white p-4 text-sm leading-6 text-cyan-950 dark:border-cyan-900 dark:bg-gray-950 dark:text-cyan-100">
            Anbefalinger vises igen, når mindst én relevant datakilde kan hentes.
          </p>
        )}
      </div>
    </section>
  );
}
