import type { DraftStatusFilter } from "./ShiftPlanningSavedDraftsList";

type DraftStatusFilterOption = {
  value: DraftStatusFilter;
  label: string;
  count: number;
};

type ShiftPlanningSavedDraftsFilterPanelProps = {
  activeFilter: DraftStatusFilter;
  filters: DraftStatusFilterOption[];
  onSelectFilter: (filter: DraftStatusFilter) => void;
};

export function ShiftPlanningSavedDraftsFilterPanel({
  activeFilter,
  filters,
  onSelectFilter,
}: ShiftPlanningSavedDraftsFilterPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <div className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
          Filtrér kladder
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Vælg om du vil fokusere på åbne, publicerede eller erstattede
          kladder.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onSelectFilter(filter.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                isActive
                  ? "bg-blue-600 text-white ring-blue-600 dark:bg-blue-500 dark:ring-blue-500"
                  : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-800 dark:hover:bg-gray-800"
              }`}
            >
              {filter.label} · {filter.count}
            </button>
          );
        })}
      </div>
    </section>
  );
}
