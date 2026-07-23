import type { LeaveStatusCounts } from "../../helpers/core/leaveRequestTypes";

type LeaveRequestsSummaryCardsProps = {
  statusCounts: LeaveStatusCounts;
  onShowPendingOnly: () => void;
};

const cardClass =
  "rounded-2xl border p-5 text-gray-900 shadow-sm transition-colors dark:text-gray-100";

export default function LeaveRequestsSummaryCards({
  statusCounts,
  onShowPendingOnly,
}: LeaveRequestsSummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-5" aria-label="Statusoversigt">
      <div
        className={`${cardClass} ${
          statusCounts.pending > 0
            ? "border-yellow-300 bg-yellow-50 dark:border-yellow-900/70 dark:bg-yellow-950/30"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Afventer
        </div>
        <div className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
          {statusCounts.pending}
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Ansøgninger der afventer behandling.
        </div>
        {statusCounts.pending > 0 && (
          <button
            type="button"
            onClick={onShowPendingOnly}
            className="mt-3 rounded-xl bg-yellow-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-yellow-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 dark:bg-yellow-600 dark:hover:bg-yellow-500 dark:focus-visible:ring-yellow-400 dark:focus-visible:ring-offset-gray-900"
          >
            Vis afventende
          </button>
        )}
      </div>

      <div className={`${cardClass} border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900`}>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Godkendte
        </div>
        <div className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
          {statusCounts.approved}
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Fravær der er godkendt.
        </div>
      </div>

      <div className={`${cardClass} border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900`}>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Afviste
        </div>
        <div className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
          {statusCounts.rejected}
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Ansøgninger der er afvist.
        </div>
      </div>

      <div className={`${cardClass} border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900`}>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Annullerede
        </div>
        <div className="mt-1 text-3xl font-bold text-gray-950 dark:text-white">
          {statusCounts.cancelled}
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Ansøgninger du eller administrationen har annulleret.
        </div>
      </div>

      <div className={`${cardClass} border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30`}>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Udløbet
        </div>
        <div className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
          {statusCounts.expired}
        </div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Ansøgninger der ikke blev behandlet inden fraværets start.
        </div>
      </div>
    </section>
  );
}
