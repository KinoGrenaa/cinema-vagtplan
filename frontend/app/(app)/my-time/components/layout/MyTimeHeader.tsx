import { formatDate } from "../../helpers/myTimeDate";

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
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mine timer</h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Se dine indberettede og godkendte timer.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              Viser: {statusFilterSummary}
            </span>

            {needsChangesCount > 0 && (
              <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                {needsChangesCount} kræver handling
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenFilterModal}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
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
                className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                Vis det der skal rettes
              </button>
            )}
          </div>
        </div>

        <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40 lg:w-auto lg:min-w-72">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Lønperiode
          </div>

          <div className="mt-1 text-base font-semibold">
            {formatDate(payrollPeriod.startDate)} →{" "}
            {formatDate(payrollPeriod.endDate)}
          </div>

          {payrollPeriodLoading && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Henter lønperiode...
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPreviousPayrollPeriod}
              disabled={payrollPeriodLoading}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              Forrige
            </button>

            <button
              type="button"
              onClick={onCurrentPayrollPeriod}
              disabled={payrollPeriodLoading}
              className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Aktuel
            </button>

            <button
              type="button"
              onClick={onNextPayrollPeriod}
              disabled={payrollPeriodLoading}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              Næste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
