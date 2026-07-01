import { ShiftPlanningDraftValidationHeader } from "./ShiftPlanningDraftValidationHeader";
import { ShiftPlanningDraftValidationResultSection } from "./ShiftPlanningDraftValidationResultSection";
import { ShiftPlanningDraftValidationStateMessage } from "./ShiftPlanningDraftValidationStateMessage";
import type { DraftValidationResult } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftValidationPanelProps = {
  errorMessage: string | null;
  result: DraftValidationResult | null;
};

export function ShiftPlanningDraftValidationPanel({
  errorMessage,
  result,
}: ShiftPlanningDraftValidationPanelProps) {
  return (
    <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900/70 dark:bg-gray-950/70">
      <ShiftPlanningDraftValidationHeader checkedAt={result?.checkedAt ?? null} />

      <ShiftPlanningDraftValidationStateMessage
        errorMessage={errorMessage}
        hasResult={Boolean(result)}
      />

      {result && (
        <ShiftPlanningDraftValidationResultSection
          issues={result.issues ?? []}
          summary={result.summary}
        />
      )}
    </div>
  );
}
