import { formatHoursDuration } from "../../helpers/core/myTimeEntries";

type MyTimeSummaryCardsProps = {
  approvedHours: number;
  pendingHours: number;
  needsChangesCount: number;
  onShowNeedsChangesEntries: () => void;
};

export default function MyTimeSummaryCards({
  approvedHours,
  pendingHours,
  needsChangesCount,
  onShowNeedsChangesEntries,
}: MyTimeSummaryCardsProps) {
  return (
    <section
      aria-label="Overblik over mine timer"
      className="mb-4 grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:grid-cols-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <article className="border-b border-green-200 bg-green-50/70 p-4 text-gray-900 md:border-b-0 md:border-r dark:border-green-900/70 dark:bg-green-950/20 dark:text-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-300">
          Godkendt
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
          {formatHoursDuration(approvedHours)}
        </p>
      </article>

      <article className="border-b border-amber-200 bg-amber-50/70 p-4 text-gray-900 md:border-b-0 md:border-r dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Afventer
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
          {formatHoursDuration(pendingHours)}
        </p>
      </article>

      <article
        className={`p-4 text-gray-900 dark:text-gray-100 ${
          needsChangesCount > 0
            ? "bg-orange-50 dark:bg-orange-950/25"
            : "bg-white dark:bg-gray-900"
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            needsChangesCount > 0
              ? "text-orange-800 dark:text-orange-300"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Kræver handling
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p
            className={`text-2xl font-bold ${
              needsChangesCount > 0
                ? "text-orange-900 dark:text-orange-200"
                : "text-gray-950 dark:text-white"
            }`}
          >
            {needsChangesCount}
          </p>
          {needsChangesCount > 0 && (
            <button
              type="button"
              onClick={onShowNeedsChangesEntries}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700 active:bg-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 dark:bg-orange-500 dark:text-gray-950 dark:hover:bg-orange-400 dark:active:bg-orange-300 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-gray-900"
            >
              Vis
            </button>
          )}
        </div>
      </article>
    </section>
  );
}
