import Link from "next/link";

import {
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type OperationsStatusValue =
  | "UNKNOWN"
  | "NORMAL"
  | "WARNING"
  | "CRITICAL";

type Props = {
  liveOperationsStatus: OperationsStatusValue;
  shiftsSourceStatus: DashboardSourceStatus;
  moviesSourceStatus: DashboardSourceStatus;
  hasMovieShowings: boolean;
};

type StatusContent = {
  label: string;
  description: string;
  actionLabel?: string;
};

const statusContent: Record<OperationsStatusValue, StatusContent> = {
  UNKNOWN: {
    label: "Ukendt",
    description:
      "Status kan ikke vurderes endnu. Kontrollér, at dagens vagtplan og filmprogram er opdateret.",
    actionLabel: "Kontrollér dagens vagtplan",
  },
  NORMAL: {
    label: "Normal",
    description:
      "Dagens bemanding og aktivitet ser ud til at være i balance ud fra de tilgængelige data.",
  },
  WARNING: {
    label: "Kræver opmærksomhed",
    description:
      "Dagens bemanding eller aktivitet rammer en eller flere advarselstærskler og bør gennemgås.",
    actionLabel: "Gennemgå dagens vagtplan",
  },
  CRITICAL: {
    label: "Kritisk",
    description:
      "Dagens data rammer kritiske tærskler for bemanding, vagtlængde eller billetbelastning.",
    actionLabel: "Åbn dagens vagtplan",
  },
};

export default function OperationsStatus({
  liveOperationsStatus,
  shiftsSourceStatus,
  moviesSourceStatus,
  hasMovieShowings,
}: Props) {
  const shiftsReadable = isDashboardSourceReadable(
    shiftsSourceStatus,
  );
  const moviesReadable = isDashboardSourceReadable(
    moviesSourceStatus,
  );
  const hasStaleData =
    isDashboardSourceStale(shiftsSourceStatus) ||
    isDashboardSourceStale(moviesSourceStatus);
  const effectiveStatus = shiftsReadable
    ? liveOperationsStatus
    : "UNKNOWN";
  const content = statusContent[effectiveStatus];
  const dataNotice = !shiftsReadable
    ? "Dagens vagtplan kunne ikke hentes. Driftsstatus kan derfor ikke beregnes."
    : !moviesReadable
      ? "Filmprogrammet kunne ikke hentes. Status bygger derfor kun på vagtplanen."
      : !hasMovieShowings
        ? "Dagens filmprogram indeholder ingen forestillinger. Status bygger derfor primært på vagtplanen."
        : hasStaleData
          ? "Status bygger helt eller delvist på tidligere hentede data."
          : null;

  return (
    <section
      aria-labelledby="dashboard-operations-status-heading"
      className={`rounded-2xl border p-6 shadow-sm ${
        effectiveStatus === "UNKNOWN"
          ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          : effectiveStatus === "NORMAL"
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
            : effectiveStatus === "WARNING"
              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
      }`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="text-4xl" aria-hidden="true">
            {effectiveStatus === "UNKNOWN"
              ? "⚪"
              : effectiveStatus === "NORMAL"
                ? "🟢"
                : effectiveStatus === "WARNING"
                  ? "🟡"
                  : "🔴"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="dashboard-operations-status-heading"
                className="text-2xl font-bold"
              >
                Driftsstatus lige nu
              </h2>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold dark:bg-black/20">
                Automatisk beregnet
              </span>
              {hasStaleData && (
                <DashboardSourceBadge status={{ state: "stale" }} />
              )}
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 opacity-80">
              {content.description}
            </p>
            {dataNotice && (
              <p className="mt-2 max-w-3xl rounded-lg bg-white/60 px-3 py-2 text-sm leading-6 dark:bg-black/20">
                {dataNotice}
              </p>
            )}
            <p className="mt-2 max-w-3xl text-xs leading-5 opacity-70">
              Status er en støtte til gennemgang af dagens drift og erstatter ikke en konkret kontrol af vagtplanen.
            </p>
            {content.actionLabel && (
              <Link
                href="/schedule"
                className="mt-4 inline-flex items-center gap-1 rounded-lg font-semibold underline decoration-2 underline-offset-4 transition hover:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                {content.actionLabel}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
        <div
          className={`shrink-0 self-start rounded-full px-6 py-3 text-sm font-bold md:self-auto ${
            effectiveStatus === "UNKNOWN"
              ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              : effectiveStatus === "NORMAL"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : effectiveStatus === "WARNING"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {content.label}
        </div>
      </div>
    </section>
  );
}
