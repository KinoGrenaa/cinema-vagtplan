import type { LeaveStatusCounts } from "../../helpers/core/leaveRequestTypes";

type LeaveRequestsSummaryCardsProps = {
  statusCounts: LeaveStatusCounts;
  onShowPendingOnly: () => void;
};

export default function LeaveRequestsSummaryCards({
  statusCounts,
  onShowPendingOnly,
}: LeaveRequestsSummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-5">
      <div
        className={`rounded-2xl border p-5 shadow-sm transition-colors ${
          statusCounts.pending > 0
            ? "border-yellow-300 bg-yellow-50 dark:border-yellow-900/70 dark:bg-yellow-950/30"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Afventer
        </div>
        <div className="mt-1 text-3xl font-bold">{statusCounts.pending}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ansøgninger der afventer behandling.
        </div>
        {statusCounts.pending > 0 && (
          <button
            type="button"
            onClick={onShowPendingOnly}
            className="mt-3 rounded-xl bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-yellow-700"
          >
            Vis afventende
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Godkendte
        </div>
        <div className="mt-1 text-3xl font-bold">{statusCounts.approved}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Fravær der er godkendt.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">Afviste</div>
        <div className="mt-1 text-3xl font-bold">{statusCounts.rejected}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ansøgninger der er afvist.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Annullerede
        </div>
        <div className="mt-1 text-3xl font-bold">{statusCounts.cancelled}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ansøgninger du eller administrationen har annulleret.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
        <div className="text-sm text-slate-600 dark:text-slate-300">Udløbet</div>
        <div className="mt-1 text-3xl font-bold">{statusCounts.expired}</div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Ansøgninger der ikke blev behandlet inden fraværets start.
        </div>
      </div>
    </section>
  );
}
