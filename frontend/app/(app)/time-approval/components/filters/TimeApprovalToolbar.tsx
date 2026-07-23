type TimeApprovalToolbarProps = {
  activeFilterCount: number;
  employeeSearch: string;
  pendingCount: number;
  needsChangesCount: number;
  onEmployeeSearchChange: (
    value: string,
  ) => void;
  onOpenFilters: () => void;
  onResetFilters: () => void;
};

export default function TimeApprovalToolbar({
  activeFilterCount,
  employeeSearch,
  pendingCount,
  needsChangesCount,
  onEmployeeSearchChange,
  onOpenFilters,
  onResetFilters,
}: TimeApprovalToolbarProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1 space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Viser som standard
            afventende registreringer
            og registreringer, der er
            sendt retur til rettelse.

            <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
              Afventer:{" "}
              {pendingCount}
            </span>

            <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
              Skal rettes:{" "}
              {needsChangesCount}
            </span>
          </div>

          <label className="block max-w-xl text-sm font-medium text-gray-700 dark:text-gray-200">
            Søg medarbejder

            <input
              type="search"
              value={employeeSearch}
              onChange={(event) =>
                onEmployeeSearchChange(
                  event.target.value,
                )
              }
              placeholder="Søg på navn eller e-mail..."
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
            >
              Nulstil filtre
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFilters}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:ring-gray-300 dark:focus-visible:ring-offset-gray-900"
          >
            Filtre
            {activeFilterCount > 0
              ? ` (${activeFilterCount})`
              : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
