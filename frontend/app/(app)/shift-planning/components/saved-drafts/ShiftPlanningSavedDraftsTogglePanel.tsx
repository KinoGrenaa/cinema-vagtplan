type ShiftPlanningSavedDraftsTogglePanelProps = {
  filteredDraftCount: number;
  hiddenDraftCount: number;
  selectedFilterText: string;
  showAllDrafts: boolean;
  onToggle: () => void;
};

export function ShiftPlanningSavedDraftsTogglePanel({
  filteredDraftCount,
  hiddenDraftCount,
  selectedFilterText,
  showAllDrafts,
  onToggle,
}: ShiftPlanningSavedDraftsTogglePanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {showAllDrafts
          ? `Alle ${filteredDraftCount} ${selectedFilterText} i denne måned vises.`
          : `${hiddenDraftCount} ældre ${selectedFilterText} er skjult, så listen er nemmere at overskue.`}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-white dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
      >
        {showAllDrafts ? "Vis færre" : `Vis alle ${filteredDraftCount} forhåndsvisninger`}
      </button>
    </div>
  );
}
