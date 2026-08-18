import ProjectDatePicker from "@/app/components/date/ProjectDatePicker";
import { formatDateDK } from "@/app/utils/dateTime";

import { describePayrollModel } from "../../utils";

type PayrollHeaderUser = {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
};

type PayrollHeaderProps = {
  adjustmentCount: number;
  cinemaSettings: Parameters<typeof describePayrollModel>[0];
  endDate: string;
  loading: boolean;
  pendingCount: number;
  showAdvancedFilters: boolean;
  startDate: string;
  userId: string;
  users: PayrollHeaderUser[];
  onApplyCurrentPayrollPeriod: () => void;
  onNextPayrollPeriod: () => void;
  onPreviousPayrollPeriod: () => void;
  onRefreshPayroll: () => void;
  onSetEndDate: (value: string) => void;
  onSetStartDate: (value: string) => void;
  onSetUserId: (value: string) => void;
  onToggleAdvancedFilters: () => void;
};

const secondaryButtonClass =
  "rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900";

const primaryButtonClass =
  "rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900";

export default function PayrollHeader({
  adjustmentCount,
  cinemaSettings,
  endDate,
  loading,
  pendingCount,
  showAdvancedFilters,
  startDate,
  userId,
  users,
  onApplyCurrentPayrollPeriod,
  onNextPayrollPeriod,
  onPreviousPayrollPeriod,
  onRefreshPayroll,
  onSetEndDate,
  onSetStartDate,
  onSetUserId,
  onToggleAdvancedFilters,
}: PayrollHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Løn
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Gennemgå timer, håndter afvigelser og klargør lønperioden til
            eksport.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
              {describePayrollModel(cinemaSettings)}
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {pendingCount} afventer godkendelse
              </span>
            )}
            {adjustmentCount > 0 && (
              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                {adjustmentCount} efterregulering
                {adjustmentCount === 1 ? "" : "er"}
              </span>
            )}
          </div>
        </div>

        <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40 xl:w-auto xl:min-w-[420px]">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Valgt lønperiode
          </div>
          <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatDateDK(startDate)} → {formatDateDK(endDate)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPreviousPayrollPeriod}
              className={secondaryButtonClass}
            >
              Forrige
            </button>
            <button
              type="button"
              onClick={onApplyCurrentPayrollPeriod}
              className={primaryButtonClass}
            >
              Aktuel
            </button>
            <button
              type="button"
              onClick={onNextPayrollPeriod}
              className={secondaryButtonClass}
            >
              Næste
            </button>
            <button
              type="button"
              onClick={onToggleAdvancedFilters}
              className={secondaryButtonClass}
              aria-expanded={showAdvancedFilters}
            >
              {showAdvancedFilters ? "Skjul filter" : "Filter"}
            </button>
          </div>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Avanceret filter
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Brug kun dette, hvis du skal se en anden periode eller én
              medarbejder.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Startdato
              </label>
              <ProjectDatePicker
                value={startDate}
                onChange={onSetStartDate}
                clearable
                ariaLabel={"V\u00e6lg startdato"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Slutdato
              </label>
              <ProjectDatePicker
                value={endDate}
                onChange={onSetEndDate}
                clearable
                ariaLabel={"V\u00e6lg slutdato"}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Medarbejder
              </label>
              <select
                value={userId}
                onChange={(event) => onSetUserId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="">Alle medarbejdere</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={onRefreshPayroll}
                disabled={loading}
                className={`w-full ${primaryButtonClass}`}
              >
                {loading ? "Henter..." : "Opdater"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
