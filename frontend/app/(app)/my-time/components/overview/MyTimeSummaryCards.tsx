import { formatHoursDuration } from "../../helpers/myTimeEntries";

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
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Godkendte timer
        </div>

        <div className="mt-1 text-2xl font-bold">
          {formatHoursDuration(approvedHours)}
        </div>

        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Tæller med i løngrundlaget.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Afventer godkendelse
        </div>

        <div className="mt-1 text-2xl font-bold">
          {formatHoursDuration(pendingHours)}
        </div>

        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ikke med i løn før godkendelse.
        </div>
      </div>

      <div
        className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-900 ${
          needsChangesCount > 0
            ? "border-orange-300 ring-1 ring-orange-200 dark:border-orange-800 dark:ring-orange-900/60"
            : "border-gray-200 dark:border-gray-800"
        }`}
      >
        <div
          className={`text-sm ${
            needsChangesCount > 0
              ? "font-semibold text-orange-700 dark:text-orange-300"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Kræver handling
        </div>

        <div
          className={`mt-1 text-2xl font-bold ${
            needsChangesCount > 0 ? "text-orange-700 dark:text-orange-300" : ""
          }`}
        >
          {needsChangesCount}
        </div>

        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Registreringer sendt retur til rettelse.
        </div>

        {needsChangesCount > 0 && (
          <button
            type="button"
            onClick={onShowNeedsChangesEntries}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
          >
            Vis registreringer
          </button>
        )}
      </div>
    </div>
  );
}
