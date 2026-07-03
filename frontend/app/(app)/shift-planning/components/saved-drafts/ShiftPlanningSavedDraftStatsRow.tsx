import { toNumber } from "../../helpers/shiftPlanningDraftHelpers";
import type { SavedDraftSummary } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningSavedDraftStatsRowProps = {
  draft: SavedDraftSummary;
};

export function ShiftPlanningSavedDraftStatsRow({
  draft,
}: ShiftPlanningSavedDraftStatsRowProps) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-gray-700 dark:text-gray-300">
      <span>{toNumber(draft.itemCount)} vagter</span>
      <span>{toNumber(draft.unassignedItemCount)} uden standard</span>
      <span>{toNumber(draft.warningItemCount)} advarsler</span>
    </div>
  );
}
