import type { PayrollPeriodStatusProps } from "../../types";
import { formatDateTime, formatHours } from "../../utils";
import PayrollWarnings from "./PayrollWarnings";

export default function PayrollPeriodStatus({
  period,
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
  const periodStatus = period?.status ?? "OPEN";
  const isOpenPeriod =
    periodStatus === "OPEN" || periodStatus === "UNLOCKED";
  const hasWarnings =
    pendingCount > 0 ||
    voidedCount > 0 ||
    adjustmentCount > 0;
  const exportBlocked = pendingCount > 0;
  const statusLabel =
    periodStatus === "LOCKED"
      ? "Låst"
      : periodStatus === "EXPORTED"
        ? "Eksporteret"
        : "Åben";
  const statusClasses =
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
            {period?.lockedAt && (
              <span>
                Låst: {formatDateTime(period.lockedAt)}
              </span>
            )}
            {period?.exportedAt && (
              <span>
                Eksporteret:{" "}
                {formatDateTime(period.exportedAt)}
              </span>
            )}
            {period?.unlockedAt && (
              <span>
                Genåbnet:{" "}
                {formatDateTime(period.unlockedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isOpenPeriod && (
            <button
              type="button"
              onClick={onLockPeriod}
              disabled={locking}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {locking ? "Låser..." : "Lås lønperiode"}
            </button>
          )}

          {(periodStatus === "LOCKED" ||
            periodStatus === "EXPORTED") && (
            <button
              type="button"
              onClick={onUnlockPeriod}
              disabled={unlocking}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950"
            >
              {unlocking
                ? "Genåbner..."
                : "Genåbn lønperiode"}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenExportModal}
            disabled={exporting || exportBlocked}
            title={
              exportBlocked
                ? "Håndtér tidsregistreringerne, før perioden eksporteres."
                : undefined
            }
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
