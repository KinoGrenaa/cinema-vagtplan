"use client";

import type { DashboardOperationalWarning } from "../../helpers/dashboardOperationsHorizon";
import type { DashboardWarningDecision } from "../../services/dashboardOperationsService";

type Props = {
  warning: DashboardOperationalWarning | null;
  decisions: DashboardWarningDecision[];
  onClose: () => void;
};

const decisionTimestampFormatter = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDecisionTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : decisionTimestampFormatter.format(date).replace(" kl.", " kl.");
}

function getActionLabel(action: DashboardWarningDecision["action"]) {
  return action === "IGNORED" ? "Ignoreret" : "Genåbnet";
}

export default function DashboardWarningHistoryModal({
  warning,
  decisions,
  onClose,
}: Props) {
  if (!warning || decisions.length === 0) return null;

  const history = [...decisions].reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-warning-history-title"
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="dashboard-warning-history-title"
              className="text-xl font-bold text-gray-950 dark:text-white"
            >
              Historik ({decisions.length})
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {warning.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Luk historik"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400"
          >
            Luk
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {warning.details}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {history.map((decision) => {
            const timestamp = formatDecisionTimestamp(decision.createdAt);

            return (
              <article
                key={decision.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                    {getActionLabel(decision.action)}
                  </span>
                  {timestamp ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {timestamp}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {decision.user.firstName} {decision.user.lastName}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {decision.note
                    ? `Begrundelse: ${decision.note}`
                    : "Ingen begrundelse angivet."}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
