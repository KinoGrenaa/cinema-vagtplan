import { getSavedDraftAttention } from "../../helpers/shiftPlanningSavedDraftAttention";
import type { SavedDraftSummary } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningSavedDraftAttentionNoticeProps = {
  draft: SavedDraftSummary;
};

export function ShiftPlanningSavedDraftAttentionNotice({
  draft,
}: ShiftPlanningSavedDraftAttentionNoticeProps) {
  const attention = getSavedDraftAttention(draft);

  if (!attention) {
    return null;
  }

  const classes =
    attention.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100";

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${classes}`}>
      <p className="font-semibold">{attention.title}</p>
      <p className="mt-1">{attention.message}</p>
    </div>
  );
}
