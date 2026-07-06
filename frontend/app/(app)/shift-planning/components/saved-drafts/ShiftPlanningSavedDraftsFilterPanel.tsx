import type {
  DraftStatusFilter,
  DraftStatusFilterOption,
} from "../../helpers/shiftPlanningSavedDraftFilters";

type ShiftPlanningSavedDraftsFilterPanelProps = {
  activeFilter: DraftStatusFilter;
  filters: DraftStatusFilterOption[];
  onSelectFilter: (filter: DraftStatusFilter) => void;
};

function formatAttentionCount(count: number) {
  return count === 1 ? "1 kræver kontrol" : `${count} kræver kontrol`;
}

export function ShiftPlanningSavedDraftsFilterPanel({
  activeFilter,
  filters,
  onSelectFilter,
}: ShiftPlanningSavedDraftsFilterPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
      <div className="mb-3 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
          Filtrér forslag
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Brug filtrene til hurtigt at skifte mellem åbne, oprettede og historiske forslag.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;
          const hasAttention = filter.attentionCount > 0;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onSelectFilter(filter.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                isActive
                  ? "bg-blue-600 text-white ring-blue-600 dark:bg-blue-500 dark:ring-blue-500"
                  : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-800 dark:hover:bg-gray-800"
              }`}
            >
              <span>
                {filter.label} · {filter.count}
              </span>
              {hasAttention && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100"
                  }`}
                >
                  {formatAttentionCount(filter.attentionCount)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
