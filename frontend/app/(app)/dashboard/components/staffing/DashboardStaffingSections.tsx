import Link from "next/link";

import { cleanDashboardInsight } from "../../helpers/dashboardPresentation";
import {
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";
import DashboardSectionHeading from "../layout/DashboardSectionHeading";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type DashboardStaffingSectionsProps = {
  staffingWarnings: string[];
  predictiveStaffing: string[];
  hasMovieShowings: boolean;
  shiftsSourceStatus: DashboardSourceStatus;
  moviesSourceStatus: DashboardSourceStatus;
  hasAdministrativeAccess: boolean;
};

function StatusList({
  items,
  emptyMessage,
  unavailableMessage,
  sourceReadable,
  accent,
  emptyTone = "success",
}: {
  items: string[];
  emptyMessage: string;
  unavailableMessage: string;
  sourceReadable: boolean;
  accent: "orange" | "purple";
  emptyTone?: "success" | "neutral";
}) {
  if (!sourceReadable) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        {unavailableMessage}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`rounded-xl border p-4 text-sm leading-6 ${
          emptyTone === "success"
            ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
            : "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
        }`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
        >
          <span
            aria-hidden="true"
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              accent === "orange"
                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            }`}
          >
            {index + 1}
          </span>
          <span>{cleanDashboardInsight(item)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function DashboardStaffingSections({
  staffingWarnings,
  predictiveStaffing,
  hasMovieShowings,
  shiftsSourceStatus,
  moviesSourceStatus,
  hasAdministrativeAccess,
}: DashboardStaffingSectionsProps) {
  const planningHref = hasAdministrativeAccess
    ? "/shift-planning"
    : "/schedule";
  const shiftsReadable = isDashboardSourceReadable(
    shiftsSourceStatus,
  );
  const moviesReadable = isDashboardSourceReadable(
    moviesSourceStatus,
  );
  const predictiveReadable = shiftsReadable && moviesReadable;
  const currentDataStale = isDashboardSourceStale(
    shiftsSourceStatus,
  );
  const predictiveDataStale =
    currentDataStale || isDashboardSourceStale(moviesSourceStatus);

  return (
    <section aria-labelledby="dashboard-staffing-heading">
      <DashboardSectionHeading
        id="dashboard-staffing-heading"
        eyebrow="Bemanding"
        title="Bemanding og beregnet belastning"
        description="Se de konkrete forhold i dagens plan og de regelbaserede vurderinger af resten af dagen. Datamærker viser, når vurderingen bygger på tidligere eller manglende oplysninger."
        action={
          <Link
            href={planningHref}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
          >
            {hasAdministrativeAccess
              ? "Åbn vagtplanlægning"
              : "Åbn dagens vagtplan"}
            <span aria-hidden="true">→</span>
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                  Aktuelle bemandingsforhold
                </h3>
                <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  Dagens plan
                </span>
                {currentDataStale && (
                  <DashboardSourceBadge
                    status={shiftsSourceStatus}
                  />
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Forhold i dagens vagtplan, som kan kræve opmærksomhed nu.
              </p>
            </div>
            <span
              className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${
                !shiftsReadable
                  ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  : staffingWarnings.length > 0
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {shiftsReadable ? staffingWarnings.length : "—"}
            </span>
          </div>
          <StatusList
            items={staffingWarnings}
            sourceReadable={shiftsReadable}
            unavailableMessage="Dagens vagtplan kunne ikke hentes, så bemandingsforholdene kan ikke vurderes."
            emptyMessage="Der er ingen aktuelle bemandingsadvarsler i dagens vagtplan."
            accent="orange"
          />
        </article>

        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                  Beregnet belastning senere i dag
                </h3>
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  Faste regler
                </span>
                {predictiveDataStale && predictiveReadable && (
                  <DashboardSourceBadge
                    status={{ state: "stale" }}
                  />
                )}
              </div>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Beregnes ud fra aftenforestillinger, solgte billetter, antal vagter og vagtlængder.
              </p>
            </div>
            <span
              className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${
                !predictiveReadable
                  ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  : predictiveStaffing.length > 0
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    : hasMovieShowings
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {predictiveReadable ? predictiveStaffing.length : "—"}
            </span>
          </div>
          <StatusList
            items={predictiveStaffing}
            sourceReadable={predictiveReadable}
            unavailableMessage="Vagtplanen eller filmprogrammet kunne ikke hentes, så den beregnede belastning kan ikke opdateres."
            emptyMessage={
              hasMovieShowings
                ? "De faste regler finder ingen forventede bemandingsproblemer lige nu."
                : "Der er ingen forestillinger i dagens filmprogram. Filmrelateret belastning beregnes derfor ikke."
            }
            accent="purple"
            emptyTone={hasMovieShowings ? "success" : "neutral"}
          />
        </article>
      </div>
    </section>
  );
}
