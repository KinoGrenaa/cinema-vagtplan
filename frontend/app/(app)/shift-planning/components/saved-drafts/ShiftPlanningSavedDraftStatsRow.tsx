import { getSavedDraftAttentionCounts } from "../../helpers/shiftPlanningSavedDraftAttention";
import type { SavedDraftSummary } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningSavedDraftStatsRowProps = {
  draft: SavedDraftSummary;
};

function getStatClasses(isAttention: boolean) {
  return isAttention
    ? "rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
    : "rounded-full bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-900 dark:text-gray-300";
}

export function ShiftPlanningSavedDraftStatsRow({
  draft,
}: ShiftPlanningSavedDraftStatsRowProps) {
  const { itemCount, unassignedCount, warningCount } =
    getSavedDraftAttentionCounts(draft);

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
        {itemCount} vagter
      </span>
      <span className={getStatClasses(unassignedCount > 0)}>
        {unassignedCount} uden standard
      </span>
      <span className={getStatClasses(warningCount > 0)}>
        {warningCount} advarsler
      </span>
    </div>
  );
}
