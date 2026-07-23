import type {
  DraftStatusFilter,
  DraftStatusFilterOption,
} from "../../helpers/shiftPlanningSavedDraftFilters";

type ShiftPlanningSavedDraftsFilterPanelProps = {
  activeFilter: DraftStatusFilter;
  filters: DraftStatusFilterOption[];
  onSelectFilter: (
    filter: DraftStatusFilter,
  ) => void;
};

function formatAttentionCount(
  count: number,
) {
  return count === 1
    ? "1 kræver kontrol"
    : `${count} kræver kontrol`;
}

export function ShiftPlanningSavedDraftsFilterPanel({
  activeFilter,
  filters,
  onSelectFilter,
}: ShiftPlanningSavedDraftsFilterPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-100">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
          Filtrér forslag
        </h3>

        <p className="text-xs text-gray-600 dark:text-gray-300">
          Brug “Kræver kontrol” til kun
          at se åbne forslag med
          advarsler eller vagter uden
          standardmedarbejder.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive =
            activeFilter ===
            filter.value;
          const hasAttention =
            filter.value !==
              "ATTENTION" &&
            filter.attentionCount > 0;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() =>
                onSelectFilter(
                  filter.value,
                )
              }
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 ${
                isActive
                  ? "bg-blue-700 text-white ring-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:ring-blue-600 dark:hover:bg-blue-500"
                  : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              <span>
                {filter.label} ·{" "}
                {filter.count}
              </span>

              {hasAttention && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-100"
                  }`}
                >
                  {formatAttentionCount(
                    filter.attentionCount,
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
