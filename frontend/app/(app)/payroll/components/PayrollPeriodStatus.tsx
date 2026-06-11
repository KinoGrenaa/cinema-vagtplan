import type { PayrollPeriodStatusProps } from "../types";
import { formatDateTime } from "../utils";
import PayrollWarnings from "./PayrollWarnings";

export default function PayrollPeriodStatus({
  period,
  totalHours,
  pendingCount,
  voidedCount,
  locking,
  unlocking,
  onLockPeriod,
  onUnlockPeriod,
  onOpenTimeApproval,
}: PayrollPeriodStatusProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Lønperiode status
          </div>

          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {period?.status === "LOCKED"
              ? "Låst"
              : period?.status === "EXPORTED"
                ? "Eksporteret"
                : "Åben"}
          </div>

          {period?.lockedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Låst: {formatDateTime(period.lockedAt)}
            </div>
          )}

          {period?.exportedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Eksporteret: {formatDateTime(period.exportedAt)}
            </div>
          )}

          {period?.unlockedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Låst op: {formatDateTime(period.unlockedAt)}
            </div>
          )}
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Godkendte timer
            </div>
            <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
              {totalHours.toFixed(2).replace(".", ",")}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 px-4 py-3 dark:border-amber-800">
            <div className="text-xs text-amber-700 dark:text-amber-300">
              Afventer godkendelse
            </div>
            <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">
              {pendingCount}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Annullerede
            </div>
            <div className="mt-1 text-lg font-bold text-gray-700 dark:text-gray-300">
              {voidedCount}
            </div>
          </div>
        </div>

        <PayrollWarnings
          pendingCount={pendingCount}
          voidedCount={voidedCount}
          onOpenTimeApproval={onOpenTimeApproval}
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onLockPeriod}
            disabled={locking || period?.status === "LOCKED"}
            className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            {locking ? "Låser..." : "Lås periode"}
          </button>

          {period && (
            <button
              onClick={onUnlockPeriod}
              disabled={unlocking}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {unlocking ? "Låser op..." : "Lås periode op"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
