import { formatDate } from "../../helpers/core/myTimeDate";

type PayrollPeriod = {
  startDate: string;
  endDate: string;
};

type MyTimeHeaderProps = {
  statusFilterSummary: string;
  needsChangesCount: number;
  activeStatusFilterCount: number;
  payrollPeriod: PayrollPeriod;
  payrollPeriodLoading: boolean;
  onOpenFilterModal: () => void;
  onShowNeedsChangesEntries: () => void;
  onPreviousPayrollPeriod: () => void;
  onCurrentPayrollPeriod: () => void;
  onNextPayrollPeriod: () => void;
};

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function MyTimeHeader({
  statusFilterSummary,
  needsChangesCount,
  activeStatusFilterCount,
  payrollPeriod,
  payrollPeriodLoading,
  onOpenFilterModal,
  onShowNeedsChangesEntries,
  onPreviousPayrollPeriod,
  onCurrentPayrollPeriod,
  onNextPayrollPeriod,
}: MyTimeHeaderProps) {
  return (
    <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
            Mine timer
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Se dine indberettede og godkendte timer.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
              Viser: {statusFilterSummary}
            </span>
            {needsChangesCount > 0 && (
              <span className="rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100">
                {needsChangesCount} kræver handling
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenFilterModal}
            className={`rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-100 focus-visible:ring-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950 dark:focus-visible:ring-blue-400 ${focusClass}`}
          >
            Filter
            {activeStatusFilterCount > 0
              ? ` (${activeStatusFilterCount})`
              : ""}
          </button>
          {needsChangesCount > 0 && (
            <button
              type="button"
              onClick={onShowNeedsChangesEntries}
              className={`rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 focus-visible:ring-orange-600 dark:bg-orange-500 dark:text-gray-950 dark:hover:bg-orange-400 dark:focus-visible:ring-orange-400 ${focusClass}`}
            >
              Vis det der skal rettes
            </button>
          )}
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Lønperiode
            </p>
            <p className="mt-1 text-lg font-bold text-gray-950 dark:text-white">
              {formatDate(payrollPeriod.startDate)} →{" "}
              {formatDate(payrollPeriod.endDate)}
            </p>
            {payrollPeriodLoading && (
              <p
                role="status"
                className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-300"
              >
                Henter lønperiode...
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPreviousPayrollPeriod}
              className={`rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 ${focusClass}`}
            >
              Forrige
            </button>
            <button
              type="button"
              onClick={onCurrentPayrollPeriod}
              className={`rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:ring-blue-600 dark:bg-blue-500 dark:text-gray-950 dark:hover:bg-blue-400 dark:focus-visible:ring-blue-400 ${focusClass}`}
            >
              Aktuel
            </button>
            <button
              type="button"
              onClick={onNextPayrollPeriod}
              className={`rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 ${focusClass}`}
            >
              Næste
            </button>
          </div>
        </div>
      </section>
    </header>
  );
}
