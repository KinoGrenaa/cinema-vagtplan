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
      className="mb-6 grid gap-4 md:grid-cols-3"
    >
      <article className="rounded-2xl border border-green-200 bg-green-50 p-5 text-gray-900 shadow-sm transition-colors dark:border-green-900/70 dark:bg-green-950/25 dark:text-gray-100">
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
          Godkendte timer
        </p>
        <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
          {formatHoursDuration(approvedHours)}
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Tæller med i løngrundlaget.
        </p>
      </article>

      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-gray-900 shadow-sm transition-colors dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-gray-100">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Afventer godkendelse
        </p>
        <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
          {formatHoursDuration(pendingHours)}
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Ikke med i løn før godkendelse.
        </p>
      </article>

      <article
        className={`rounded-2xl border p-5 text-gray-900 shadow-sm transition-colors dark:text-gray-100 ${
          needsChangesCount > 0
            ? "border-orange-300 bg-orange-50 ring-1 ring-orange-200 dark:border-orange-800 dark:bg-orange-950/30 dark:ring-orange-900/60"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            needsChangesCount > 0
              ? "text-orange-800 dark:text-orange-300"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Kræver handling
        </p>
        <p
          className={`mt-2 text-3xl font-bold ${
            needsChangesCount > 0
              ? "text-orange-900 dark:text-orange-200"
              : "text-gray-950 dark:text-white"
          }`}
        >
          {needsChangesCount}
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Registreringer sendt retur til rettelse.
        </p>
        {needsChangesCount > 0 && (
          <button
            type="button"
            onClick={onShowNeedsChangesEntries}
            className="mt-4 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 dark:bg-orange-500 dark:text-gray-950 dark:hover:bg-orange-400 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-gray-900"
          >
            Vis registreringer
          </button>
        )}
      </article>
    </section>
  );
}
