import type { PayrollPeriodStatusProps } from "../../types";
import { formatDateTime, formatHours } from "../../utils";
import {
  isPayrollReportReady,
  resolvePayrollPeriodStatus,
} from "../../helpers/payrollPeriodUi";

import PayrollWarnings from "./PayrollWarnings";

export default function PayrollPeriodStatus({
  period,
  periodLoading,
  periodLoadFailed,
  reportLoading,
  reportLoadFailed,
  totalHours,
  pendingCount,
  voidedCount,
  adjustmentCount,
  locking,
  unlocking,
  exporting,
  onLockPeriod,
  onUnlockPeriod,
  onOpenExportModal,
  onOpenTimeApproval,
}: PayrollPeriodStatusProps) {
  const periodStatus = resolvePayrollPeriodStatus(
    period?.status,
    periodLoading,
    periodLoadFailed,
  );
  const isOpenPeriod =
    periodStatus === "OPEN" || periodStatus === "UNLOCKED";
  const hasWarnings =
    pendingCount > 0 ||
    voidedCount > 0 ||
    adjustmentCount > 0;
  const unresolvedBlocked = pendingCount > 0;
  const reportReady =
    isPayrollReportReady(
      reportLoading,
      reportLoadFailed,
    );
  const reportUnavailable = !reportReady;
  const exportAllowed =
    (periodStatus === "LOCKED" ||
      periodStatus === "EXPORTED") &&
    reportReady &&
    !unresolvedBlocked;
  const exportDisabledReason = periodLoadFailed
    ? "Lønperiodens status kunne ikke indlæses."
    : periodStatus === null
      ? "Lønperiodens status indlæses."
      : reportLoadFailed
        ? "Lønrapporten kunne ikke indlæses."
        : reportLoading
          ? "Lønrapporten indlæses."
          : unresolvedBlocked
            ? "Håndtér tidsregistreringerne, før perioden eksporteres."
            : periodStatus !== "LOCKED" &&
                periodStatus !== "EXPORTED"
              ? "Lås lønperioden, før den eksporteres."
              : undefined;

  const statusLabel =
    periodLoadFailed
      ? "Status utilgængelig"
      : periodStatus === null
        ? "Indlæser..."
        :
    periodStatus === "LOCKED"
      ? "Låst"
      : periodStatus === "EXPORTED"
        ? "Eksporteret"
        : "Åben";

  const statusClasses =
    periodLoadFailed
      ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
      : periodStatus === null
        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        :
    periodStatus === "LOCKED"
      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      : periodStatus === "EXPORTED"
        ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200"
        : "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Status og handlinger
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Godkendte timer i rapporten:{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatHours(totalHours)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {!periodLoading && period?.lockedAt && (
              <span>Låst: {formatDateTime(period.lockedAt)}</span>
            )}
            {!periodLoading && period?.exportedAt && (
              <span>Eksporteret: {formatDateTime(period.exportedAt)}</span>
            )}
            {!periodLoading && period?.unlockedAt && (
              <span>Genåbnet: {formatDateTime(period.unlockedAt)}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isOpenPeriod && (
            <button
              type="button"
              onClick={onLockPeriod}
              disabled={
                locking ||
                reportUnavailable ||
                unresolvedBlocked
              }
              title={
                reportLoadFailed
                  ? "Lønrapporten kunne ikke indlæses."
                  : reportLoading
                    ? "Lønrapporten indlæses."
                    : unresolvedBlocked
                      ? "Håndtér tidsregistreringerne, før perioden låses."
                      : undefined
              }
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 active:bg-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500 dark:active:bg-green-400 dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-gray-900"
            >
              {locking ? "Låser..." : "Lås lønperiode"}
            </button>
          )}

          {periodStatus === "LOCKED" && (
            <button
              type="button"
              onClick={onUnlockPeriod}
              disabled={unlocking}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 active:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950 dark:active:bg-amber-900 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-gray-900"
            >
              {unlocking ? "Genåbner..." : "Genåbn lønperiode"}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenExportModal}
            disabled={exporting || !exportAllowed}
            title={exportDisabledReason}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            {exporting ? "Eksporterer..." : "Eksportér"}
          </button>
        </div>
      </div>

      {hasWarnings && (
        <PayrollWarnings
          pendingCount={pendingCount}
          voidedCount={voidedCount}
          adjustmentCount={adjustmentCount}
          onOpenTimeApproval={onOpenTimeApproval}
        />
      )}
    </section>
  );
}
