import Link from "next/link";

import DashboardSectionHeading from "../layout/DashboardSectionHeading";

type DashboardStaffingSectionsProps = {
  staffingWarnings: string[];
  predictiveStaffing: string[];
  movieDataAvailable: boolean;
  hasAdministrativeAccess: boolean;
};

function StatusList({
  items,
  emptyMessage,
  accent,
  emptyTone = "success",
}: {
  items: string[];
  emptyMessage: string;
  accent: "orange" | "purple";
  emptyTone?: "success" | "neutral";
}) {
  if (items.length === 0) {
    return (
      <div
        className={`rounded-xl border p-4 text-sm ${
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
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
        >
          <span
            aria-hidden="true"
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
              accent === "orange" ? "bg-orange-500" : "bg-purple-500"
            }`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardStaffingSections({
  staffingWarnings,
  predictiveStaffing,
  movieDataAvailable,
  hasAdministrativeAccess,
}: DashboardStaffingSectionsProps) {
  const planningHref = hasAdministrativeAccess
    ? "/shift-planning"
    : "/schedule";

  return (
    <section aria-labelledby="dashboard-staffing-heading">
      <DashboardSectionHeading
        id="dashboard-staffing-heading"
        eyebrow="Bemanding"
        title="Bemanding og forventninger"
        description="Se aktuelle forhold i planen og den automatiske vurdering af resten af dagen."
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

      <div
        className="grid gap-6 xl:grid-cols-2"
      >
        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                Aktuelle bemandingsforhold
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Forhold i dagens plan, som kan kræve opmærksomhed.
              </p>
            </div>
            <span
              className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${
                staffingWarnings.length > 0
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {staffingWarnings.length}
            </span>
          </div>
          <StatusList
            items={staffingWarnings}
            emptyMessage="Der er ingen aktuelle bemandingsadvarsler."
            accent="orange"
          />
        </article>

        <article className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                Forventet behov senere i dag
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Automatisk vurdering baseret på plan og filmprogram.
              </p>
            </div>
            <span
              className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${
                predictiveStaffing.length > 0
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {predictiveStaffing.length}
            </span>
          </div>
          <StatusList
            items={predictiveStaffing}
            emptyMessage={
              movieDataAvailable
                ? "Der er ingen forventede bemandingsproblemer lige nu."
                : "Filmprogrammet er tomt eller ikke tilgængeligt. Filmrelaterede forudsigelser kan ikke beregnes."
            }
            accent="purple"
            emptyTone={movieDataAvailable ? "success" : "neutral"}
          />
        </article>
      </div>
    </section>
  );
}
