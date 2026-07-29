"use client";

import type { DashboardSnapshot } from "../../helpers/dashboardSnapshot";
import { useDashboardSnapshot } from "../../hooks/useDashboardSnapshot";

type DashboardSnapshotActionsProps = {
  snapshot: DashboardSnapshot;
  disabled?: boolean;
};

const actionClass =
  "inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950";

function feedbackText(feedback: string) {
  if (feedback === "copied") return "Status er kopieret.";
  if (feedback === "downloaded") return "CSV-filen er hentet.";
  if (feedback === "error") return "Handlingen kunne ikke gennemføres.";
  return "";
}

export default function DashboardSnapshotActions({
  snapshot,
  disabled = false,
}: DashboardSnapshotActionsProps) {
  const { feedback, copySnapshot, downloadCsv, printSnapshot } =
    useDashboardSnapshot(snapshot);

  return (
    <section
      aria-label="Gem og del driftsoverblikket"
      className="print:hidden"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-gray-950 dark:text-white">
            Gem eller del overblikket
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Kopiér en kort status, hent data som CSV eller udskriv en samlet driftsrapport.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copySnapshot}
            disabled={disabled}
            className={actionClass}
          >
            Kopiér status
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={disabled}
            className={actionClass}
          >
            Hent CSV
          </button>
          <button
            type="button"
            onClick={printSnapshot}
            disabled={disabled}
            className={actionClass}
          >
            Udskriv rapport
          </button>
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 min-h-5 text-sm font-medium text-gray-600 dark:text-gray-300"
      >
        {feedbackText(feedback)}
      </p>
    </section>
  );
}
