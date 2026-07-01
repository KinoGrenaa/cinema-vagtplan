import { ShiftPlanningDraftControlMetricCard } from "./ShiftPlanningDraftControlMetricCard";
import { ShiftPlanningDraftControlWarningPanel } from "./ShiftPlanningDraftControlWarningPanel";
import { ShiftPlanningDraftPublicationReadinessPanel } from "./ShiftPlanningDraftPublicationReadinessPanel";
import type { DraftControlSummary } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftControlSummaryProps = {
  backendValidationIsGreen: boolean;
  controlSummary: DraftControlSummary;
  draftNeedsControl: boolean;
  hasValidationError: boolean;
  hasValidationResult: boolean;
  isReadyForPublication: boolean;
};

export function ShiftPlanningDraftControlSummary({
  backendValidationIsGreen,
  controlSummary,
  draftNeedsControl,
  hasValidationError,
  hasValidationResult,
  isReadyForPublication,
}: ShiftPlanningDraftControlSummaryProps) {
  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <ShiftPlanningDraftControlMetricCard
          label="Poster"
          value={controlSummary.totalItems}
        />
        <ShiftPlanningDraftControlMetricCard
          label="Datoer"
          value={controlSummary.dateCount}
        />
        <ShiftPlanningDraftControlMetricCard
          label="Ikke tildelt"
          value={controlSummary.unassignedCount}
          variant="warning"
        />
        <ShiftPlanningDraftControlMetricCard
          label="Advarsler"
          value={controlSummary.warningCount}
          variant="warning"
        />
        <ShiftPlanningDraftControlMetricCard
          label="Tid mangler"
          value={controlSummary.missingTimeCount}
          variant="warning"
        />
        <ShiftPlanningDraftControlMetricCard
          label="Data mangler"
          value={
            controlSummary.missingJobFunctionCount +
            controlSummary.missingTemplateCount
          }
          variant="warning"
        />
      </div>

      <ShiftPlanningDraftControlWarningPanel
        draftNeedsControl={draftNeedsControl}
      />

      <ShiftPlanningDraftPublicationReadinessPanel
        backendValidationIsGreen={backendValidationIsGreen}
        hasValidationError={hasValidationError}
        hasValidationResult={hasValidationResult}
        isReadyForPublication={isReadyForPublication}
      />
    </>
  );
}
