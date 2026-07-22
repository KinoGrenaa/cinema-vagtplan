import type {
  AbsenceCalendarStatusFilter,
  AbsenceCalendarSummary,
} from "../../helpers/core/absenceCalendarTypes";

type AbsenceCalendarOverviewProps = {
  summary: AbsenceCalendarSummary;
  searchQuery: string;
  statusFilter: AbsenceCalendarStatusFilter;
  onSearchQueryChange: (
    value: string,
  ) => void;
  onStatusFilterChange: (
    value: AbsenceCalendarStatusFilter,
  ) => void;
};

const summaryCards = [
  {
    key: "approvedRequests",
    label: "Godkendte ansøgninger",
  },
  {
    key: "pendingRequests",
    label: "Afventer behandling",
  },
  {
    key: "employeeCount",
    label: "Berørte medarbejdere",
  },
  {
    key: "absenceDays",
    label: "Fraværsdage i alt",
  },
] as const;

export default function AbsenceCalendarOverview({
  summary,
  searchQuery,
  statusFilter,
  onSearchQueryChange,
  onStatusFilterChange,
}: AbsenceCalendarOverviewProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(
          (card) => (
            <div
              key={card.key}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60"
            >
              <div className="text-2xl font-bold text-gray-950 dark:text-white">
                {summary[card.key]}
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {card.label}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-end dark:border-gray-800 dark:bg-gray-950/60">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-semibold">
            Find medarbejder
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              onSearchQueryChange(
                event.target.value,
              )
            }
            placeholder="Søg på navn"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950"
          />
        </label>

        <label className="md:w-60">
          <span className="mb-1 block text-sm font-semibold">
            Vis status
          </span>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(
                event.target
                  .value as AbsenceCalendarStatusFilter,
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950"
          >
            <option value="ALL">
              Godkendte og afventende
            </option>
            <option value="APPROVED">
              Kun godkendte
            </option>
            <option value="PENDING">
              Kun afventende
            </option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-green-300 bg-green-100 px-3 py-2 text-green-900 dark:border-green-800 dark:bg-green-950/45 dark:text-green-100">
            Godkendt
          </span>
          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-2 text-amber-950 dark:border-amber-800 dark:bg-amber-950/45 dark:text-amber-100">
            Afventer
          </span>
        </div>
      </div>
    </section>
  );
}
