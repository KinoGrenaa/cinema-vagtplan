import { formatCreatedAt } from "../../helpers/shiftPlanningDraftHelpers";
import type { SavedDraftSummary } from "../../helpers/shiftPlanningDraftTypes";

import { ShiftPlanningSavedDraftStatsRow } from "./ShiftPlanningSavedDraftStatsRow";
import { ShiftPlanningSavedDraftStatusBadge } from "./ShiftPlanningSavedDraftStatusBadge";

type ShiftPlanningSavedDraftCardProps = {
  draft: SavedDraftSummary;
  isSelected: boolean;
  openingDraftId: number | string | null;
  onOpenDraft: (draftId: number | string) => void;
};

export function ShiftPlanningSavedDraftCard({
  draft,
  isSelected,
  openingDraftId,
  onOpenDraft,
}: ShiftPlanningSavedDraftCardProps) {
  const isOpening = String(openingDraftId ?? "") === String(draft.id);

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        isSelected
          ? "border-blue-300 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/30"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
              ForhÃ¥ndsvisning #{draft.id}
            </h3>
            <ShiftPlanningSavedDraftStatusBadge status={draft.status} />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Gemt {formatCreatedAt(draft.createdAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenDraft(draft.id)}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
          disabled={isOpening}
        >
          {isOpening ? "Åbner..." : "Åbn kladde"}
        </button>
      </div>

      {draft.note && (
        <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          {draft.note}
        </p>
      )}

      <ShiftPlanningSavedDraftStatsRow draft={draft} />
    </article>
  );
}
