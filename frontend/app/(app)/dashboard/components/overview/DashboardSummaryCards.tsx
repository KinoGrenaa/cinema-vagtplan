import Link from "next/link";

import { formatHours } from "../../helpers/dashboardHelpers";
import DashboardSectionHeading from "../layout/DashboardSectionHeading";

type DashboardSummaryCardsProps = {
  todayPlannedHours: number;
  myRegisteredHours: number;
  movieCount: number;
  soldSeatsToday: number;
  seatLoadPercent: number;
  shiftCount: number;
  movieDataAvailable: boolean;
  canShowPersonalTime: boolean;
  moduleAccess: {
    schedule: boolean;
    timeTracking: boolean;
  };
};

type MetricCard = {
  href: string;
  label: string;
  value: string | number;
  detail: string;
};

const cardClass =
  "group rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950";

export default function DashboardSummaryCards({
  todayPlannedHours,
  myRegisteredHours,
  movieCount,
  soldSeatsToday,
  seatLoadPercent,
  shiftCount,
  movieDataAvailable,
  canShowPersonalTime,
  moduleAccess,
}: DashboardSummaryCardsProps) {
  const metrics: MetricCard[] = [];

  if (moduleAccess.schedule) {
    metrics.push(
      {
        href: "/schedule",
        label: "Planlagte arbejdstimer",
        value: formatHours(todayPlannedHours),
        detail: "Samlet planlagt tid i dag",
      },
      {
        href: "/schedule",
        label: "Vagter",
        value: shiftCount,
        detail: shiftCount === 1 ? "1 vagt i dagens plan" : `${shiftCount} vagter i dagens plan`,
      },
    );

    if (movieDataAvailable) {
      metrics.push(
        {
          href: "/schedule",
          label: "Forestillinger",
          value: movieCount,
          detail:
            movieCount === 1
              ? "1 forestilling i dagens program"
              : `${movieCount} forestillinger i dagens program`,
        },
        {
          href: "/schedule",
          label: "Solgte billetter",
          value: soldSeatsToday,
          detail: "Registreret på dagens forestillinger",
        },
        {
          href: "/schedule",
          label: "Belægning",
          value: `${seatLoadPercent}%`,
          detail: "Samlet belægning for dagens program",
        },
      );
    }
  }

  if (moduleAccess.timeTracking && canShowPersonalTime) {
    metrics.push({
      href: "/my-time",
      label: "Mine afsluttede timer",
      value: formatHours(myRegisteredHours),
      detail: "Afsluttede tidsregistreringer i dag",
    });
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-summary-heading">
      <DashboardSectionHeading
        id="dashboard-summary-heading"
        eyebrow="Dagens tal"
        title="Dagens overblik"
        description="De vigtigste tal for drift, program og arbejdstid samlet ét sted."
      />

      {!movieDataAvailable && moduleAccess.schedule && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Filmprogrammet er tomt eller ikke tilgængeligt. Filmrelaterede tal vises derfor ikke.
        </div>
      )}

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {metrics.map((metric) => (
          <Link
            key={`${metric.href}-${metric.label}`}
            href={metric.href}
            className={cardClass}
          >
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {metric.label}
            </div>
            <div className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
              {metric.value}
            </div>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {metric.detail}
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition group-hover:gap-2 dark:text-blue-300">
              Se detaljer
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
