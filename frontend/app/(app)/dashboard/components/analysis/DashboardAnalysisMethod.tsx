import Link from "next/link";

import {
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type DashboardAnalysisMethodProps = {
  shiftCount: number;
  movieCount: number;
  shiftsSourceStatus: DashboardSourceStatus;
  moviesSourceStatus: DashboardSourceStatus;
  hasAdministrativeAccess: boolean;
};

type CoverageItemProps = {
  label: string;
  value: string;
  status: DashboardSourceStatus;
};

function CoverageItem({
  label,
  value,
  status,
}: CoverageItemProps) {
  const readable = isDashboardSourceReadable(status);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-950 dark:text-white">
            {label}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {readable ? value : "Datakilden kunne ikke hentes"}
          </p>
        </div>
        <DashboardSourceBadge status={status} />
      </div>
    </div>
  );
}

export default function DashboardAnalysisMethod({
  shiftCount,
  movieCount,
  shiftsSourceStatus,
  moviesSourceStatus,
  hasAdministrativeAccess,
}: DashboardAnalysisMethodProps) {
  const planningHref = hasAdministrativeAccess
    ? "/shift-planning"
    : "/schedule";
  const hasStaleInput =
    isDashboardSourceStale(shiftsSourceStatus) ||
    isDashboardSourceStale(moviesSourceStatus);
  const hasUnavailableInput =
    !isDashboardSourceReadable(shiftsSourceStatus) ||
    !isDashboardSourceReadable(moviesSourceStatus);

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/30">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-blue-950 dark:text-blue-100">
              Sådan beregnes vurderingerne
            </h3>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Faste regler
            </span>
            {hasStaleInput && (
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Delvist tidligere data
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-blue-900/80 dark:text-blue-100/80">
            Resultaterne beregnes i browseren ud fra dagens vagtplan og filmprogram. De sendes ikke til en ekstern AI-tjeneste, og systemet lærer ikke automatisk af historiske data.
          </p>
          {hasUnavailableInput && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Nogle vurderinger kan ikke beregnes fuldt ud, fordi mindst én datakilde mangler.
            </p>
          )}
        </div>
        <Link
          href={planningHref}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-100 dark:hover:border-blue-600 dark:hover:bg-blue-950 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
        >
          {hasAdministrativeAccess
            ? "Kontrollér vagtplanlægningen"
            : "Kontrollér dagens vagtplan"}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <CoverageItem
          label="Dagens vagter"
          value={`${shiftCount} planlagte vagter indgår`}
          status={shiftsSourceStatus}
        />
        <CoverageItem
          label="Dagens filmprogram"
          value={
            movieCount === 0
              ? "0 forestillinger i dagens program"
              : `${movieCount} forestillinger indgår`
          }
          status={moviesSourceStatus}
        />
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-950 dark:text-white">
                Beregningsmetode
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Samme tærskler anvendes ved hver opdatering
              </p>
            </div>
            <span className="inline-flex shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800 dark:bg-green-900 dark:text-green-200">
              Fast
            </span>
          </div>
        </div>
      </div>
      <details className="mt-4 rounded-xl border border-blue-200 bg-white p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-gray-950 dark:text-blue-100">
        <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950">
          Se de vigtigste tærskler
        </summary>
        <ul className="mt-3 grid gap-2 leading-6 text-blue-900/80 dark:text-blue-100/80 md:grid-cols-2">
          <li>Vagter på mindst 8 timer markeres som øget belastning.</li>
          <li>Vagter på mindst 10 timer markeres som høj belastning.</li>
          <li>400 solgte billetter giver højt pres; 600 giver kritisk pres.</li>
          <li>Filmprogrammet skal kunne hentes for filmrelaterede vurderinger.</li>
        </ul>
      </details>
    </section>
  );
}
