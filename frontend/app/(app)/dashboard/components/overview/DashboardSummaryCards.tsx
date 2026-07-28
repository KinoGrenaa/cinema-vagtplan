import Link from "next/link";

import { formatHours } from "../../helpers/dashboardHelpers";
import {
  getDashboardSourceUnavailableText,
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type {
  DashboardSourceKey,
  DashboardSourceStatusMap,
} from "../../types";
import DashboardSectionHeading from "../layout/DashboardSectionHeading";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type DashboardSummaryCardsProps = {
  todayPlannedHours: number;
  myRegisteredHours: number;
  movieCount: number;
  soldSeatsToday: number;
  seatLoadPercent: number;
  shiftCount: number;
  canShowPersonalTime: boolean;
  sourceStatus: DashboardSourceStatusMap;
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
  sourceKey: DashboardSourceKey;
};

const cardClass =
  "group rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950";

function getMetricValue(
  sourceStatus: DashboardSourceStatusMap,
  sourceKey: DashboardSourceKey,
  value: string | number,
) {
  return isDashboardSourceReadable(sourceStatus[sourceKey])
    ? value
    : "—";
}

function getMetricDetail(
  sourceStatus: DashboardSourceStatusMap,
  sourceKey: DashboardSourceKey,
  currentDetail: string,
  staleDetail: string,
  unavailableDetail: string,
) {
  const status = sourceStatus[sourceKey];

  if (isDashboardSourceStale(status)) {
    return staleDetail;
  }

  if (!isDashboardSourceReadable(status)) {
    return getDashboardSourceUnavailableText(
      status,
      unavailableDetail,
    );
  }

  return currentDetail;
}

export default function DashboardSummaryCards({
  todayPlannedHours,
  myRegisteredHours,
  movieCount,
  soldSeatsToday,
  seatLoadPercent,
  shiftCount,
  canShowPersonalTime,
  sourceStatus,
  moduleAccess,
}: DashboardSummaryCardsProps) {
  const metrics: MetricCard[] = [];

  if (moduleAccess.schedule) {
    metrics.push(
      {
        href: "/schedule",
        label: "Planlagte arbejdstimer",
        value: getMetricValue(
          sourceStatus,
          "shifts",
          formatHours(todayPlannedHours),
        ),
        detail: getMetricDetail(
          sourceStatus,
          "shifts",
          "Samlet planlagt tid i dag",
          "Baseret på den senest hentede vagtplan",
          "Dagens vagtplan kunne ikke hentes",
        ),
        sourceKey: "shifts",
      },
      {
        href: "/schedule",
        label: "Vagter",
        value: getMetricValue(
          sourceStatus,
          "shifts",
          shiftCount,
        ),
        detail: getMetricDetail(
          sourceStatus,
          "shifts",
          shiftCount === 1
            ? "1 vagt i dagens plan"
            : `${shiftCount} vagter i dagens plan`,
          "Baseret på den senest hentede vagtplan",
          "Dagens vagter kunne ikke hentes",
        ),
        sourceKey: "shifts",
      },
      {
        href: "/schedule",
        label: "Forestillinger",
        value: getMetricValue(
          sourceStatus,
          "movies",
          movieCount,
        ),
        detail: getMetricDetail(
          sourceStatus,
          "movies",
          movieCount === 0
            ? "Ingen forestillinger i dagens program"
            : movieCount === 1
              ? "1 forestilling i dagens program"
              : `${movieCount} forestillinger i dagens program`,
          "Baseret på det senest hentede filmprogram",
          "Dagens filmprogram kunne ikke hentes",
        ),
        sourceKey: "movies",
      },
      {
        href: "/schedule",
        label: "Solgte billetter",
        value: getMetricValue(
          sourceStatus,
          "movies",
          soldSeatsToday,
        ),
        detail: getMetricDetail(
          sourceStatus,
          "movies",
          movieCount === 0
            ? "Ingen forestillinger at registrere billetsalg på"
            : "Registreret på dagens forestillinger",
          "Baseret på det senest hentede filmprogram",
          "Billetdata kunne ikke hentes",
        ),
        sourceKey: "movies",
      },
      {
        href: "/schedule",
        label: "Belægning",
        value: getMetricValue(
          sourceStatus,
          "movies",
          `${seatLoadPercent}%`,
        ),
        detail: getMetricDetail(
          sourceStatus,
          "movies",
          movieCount === 0
            ? "Ingen forestillinger i dagens program"
            : "Samlet belægning for dagens program",
          "Baseret på det senest hentede filmprogram",
          "Belægningen kunne ikke beregnes",
        ),
        sourceKey: "movies",
      },
    );
  }

  if (moduleAccess.timeTracking && canShowPersonalTime) {
    metrics.push({
      href: "/my-time",
      label: "Mine afsluttede timer",
      value: getMetricValue(
        sourceStatus,
        "timeEntries",
        formatHours(myRegisteredHours),
      ),
      detail: getMetricDetail(
        sourceStatus,
        "timeEntries",
        "Afsluttede tidsregistreringer i dag",
        "Baseret på de senest hentede tidsregistreringer",
        "Dine tidsregistreringer kunne ikke hentes",
      ),
      sourceKey: "timeEntries",
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
        description="De vigtigste tal for drift, program og arbejdstid samlet ét sted. Datamærker viser, når et tal ikke er aktuelt."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const status = sourceStatus[metric.sourceKey];

          return (
            <Link
              key={`${metric.href}-${metric.label}`}
              href={metric.href}
              className={cardClass}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {metric.label}
                </div>
                <DashboardSourceBadge
                  status={status}
                  hideWhenFresh
                />
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
          );
        })}
      </div>
    </section>
  );
}
