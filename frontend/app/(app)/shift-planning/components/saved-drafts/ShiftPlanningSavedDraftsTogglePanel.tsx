type ShiftPlanningSavedDraftsTogglePanelProps = {
  filteredDraftCount: number;
  hiddenAttentionDraftCount: number;
  hiddenDraftCount: number;
  selectedFilterText: string;
  showAllDrafts: boolean;
  onToggle: () => void;
};

function formatHiddenAttentionText(hiddenAttentionDraftCount: number) {
  if (hiddenAttentionDraftCount <= 0) {
    return "De viste kort dækker alle forslag med kendte opmærksomhedspunkter.";
  }

  return hiddenAttentionDraftCount === 1
    ? "1 skjult forslag har stadig opmærksomhedspunkter."
    : `${hiddenAttentionDraftCount} skjulte forslag har stadig opmærksomhedspunkter.`;
}

export function ShiftPlanningSavedDraftsTogglePanel({
  filteredDraftCount,
  hiddenAttentionDraftCount,
  hiddenDraftCount,
  selectedFilterText,
  showAllDrafts,
  onToggle,
}: ShiftPlanningSavedDraftsTogglePanelProps) {
  const collapsedMessage = `${hiddenDraftCount} øvrige ${selectedFilterText} er skjult. De vigtigste åbne forslag vises først.`;
  const expandedMessage = `Alle ${filteredDraftCount} ${selectedFilterText} i denne måned vises.`;

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
      <p>{showAllDrafts ? expandedMessage : collapsedMessage}</p>

      {!showAllDrafts && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatHiddenAttentionText(hiddenAttentionDraftCount)}
        </p>
      )}

      <button
        type="button"
        onClick={onToggle}
        className="mt-3 rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 dark:active:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-950"
      >
        {showAllDrafts
          ? "Vis færre"
          : `Vis alle ${filteredDraftCount} forhåndsvisninger`}
      </button>
    </div>
  );
}
