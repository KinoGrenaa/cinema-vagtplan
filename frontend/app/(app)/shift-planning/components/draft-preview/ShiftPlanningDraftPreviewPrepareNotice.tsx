import type { DraftPreviewPrepareState } from "../../helpers/shiftPlanningDraftPreviewReadiness";

type ShiftPlanningDraftPreviewPrepareNoticeProps = {
  state: DraftPreviewPrepareState;
};

const noticeClasses: Record<DraftPreviewPrepareState["variant"], string> = {
  blocked:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100",
  loading:
    "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-200",
  ready:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100",
};

export function ShiftPlanningDraftPreviewPrepareNotice({
  state,
}: ShiftPlanningDraftPreviewPrepareNoticeProps) {
  return (
    <div className={`mt-4 rounded-2xl border p-4 text-sm ${noticeClasses[state.variant]}`}>
      <p className="font-semibold">{state.title}</p>
      <p className="mt-1">{state.description}</p>
      <p className="mt-2 font-medium">Næste trin: {state.nextStep}</p>
    </div>
  );
}
