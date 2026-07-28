import Link from "next/link";

import { cleanDashboardInsight } from "../../helpers/dashboardPresentation";

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
  hasAdministrativeAccess: boolean;
};

const staffingHealthLabels: Record<StaffingHealth, string> = {
  UNKNOWN: "Kan ikke vurderes",
  STABLE: "Stabil",
  HIGH_PRESSURE: "Højt pres",
  CRITICAL: "Kritisk",
};

export default function AiOperationsCommandCenter({
  operationsHealth,
  operationalRecommendations,
  hasAdministrativeAccess,
}: Props) {
  const planningHref = hasAdministrativeAccess
    ? "/shift-planning"
    : "/schedule";

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-950">
          <div className="text-sm text-cyan-800 dark:text-cyan-300">
            Bemandingssituation
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-950 dark:text-cyan-100">
            {staffingHealthLabels[operationsHealth.staffingHealth]}
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-950">
          <div className="text-sm text-cyan-800 dark:text-cyan-300">
            Vagter i dag
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-950 dark:text-cyan-100">
            {operationsHealth.activeShiftCount}
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-950">
          <div className="text-sm text-cyan-800 dark:text-cyan-300">
            Vagter på mindst 8 timer
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-950 dark:text-cyan-100">
            {operationsHealth.highFatigueEmployees}
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-950">
          <div className="text-sm text-cyan-800 dark:text-cyan-300">
            Solgte billetter i programmet
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-950 dark:text-cyan-100">
            {operationsHealth.movieDataAvailable
              ? operationsHealth.moviePressure
              : "Mangler data"}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-lg font-bold text-cyan-950 dark:text-cyan-100">
            Hvad bør kontrolleres?
          </h4>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-800 dark:bg-gray-950 dark:text-cyan-200">
            {operationalRecommendations.length} forhold
          </span>
        </div>
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
      </div>
    </section>
  );
}
