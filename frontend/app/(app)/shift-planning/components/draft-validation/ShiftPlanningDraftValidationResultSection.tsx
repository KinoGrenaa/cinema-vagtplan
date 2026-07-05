import { ShiftPlanningDraftValidationIssueCard } from "./ShiftPlanningDraftValidationIssueCard";
import { ShiftPlanningDraftValidationMetricCard } from "./ShiftPlanningDraftValidationMetricCard";

import { ShiftPlanningIssueActionSummary } from "../shared/ShiftPlanningIssueActionSummary";

import { toNumber } from "../../helpers/shiftPlanningDraftHelpers";
import {
  getValidationIssueKey,
  MAX_VISIBLE_VALIDATION_ISSUES,
  sortValidationIssuesBySeverity,
} from "../../helpers/shiftPlanningDraftValidationHelpers";
import type {
  DraftValidationIssue,
  DraftValidationSummary,
} from "../../helpers/shiftPlanningDraftTypes";
import { getDraftValidationIssueActionHints } from "../../helpers/shiftPlanningIssueActionHints";

type ShiftPlanningDraftValidationResultSectionProps = {
  issues: DraftValidationIssue[];
  summary: DraftValidationSummary | null | undefined;
};

export function ShiftPlanningDraftValidationResultSection({
  issues,
  summary,
}: ShiftPlanningDraftValidationResultSectionProps) {
  const sortedIssues = sortValidationIssuesBySeverity(issues);
  const visibleIssues = sortedIssues.slice(0, MAX_VISIBLE_VALIDATION_ISSUES);
  const hiddenIssueCount = Math.max(0, issues.length - visibleIssues.length);
  const actionHints = getDraftValidationIssueActionHints(sortedIssues);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ShiftPlanningDraftValidationMetricCard
          label="Status"
          value={summary?.isValid ? "OK" : "Stop"}
          variant={summary?.isValid ? "success" : "error"}
        />
        <ShiftPlanningDraftValidationMetricCard
          label="Fejl"
          value={toNumber(summary?.errorCount)}
          variant="error"
        />
        <ShiftPlanningDraftValidationMetricCard
          label="Advarsler"
          value={toNumber(summary?.warningCount)}
          variant="warning"
        />
        <ShiftPlanningDraftValidationMetricCard
          label="Problemer"
          value={toNumber(summary?.issueCount)}
          variant={toNumber(summary?.issueCount) > 0 ? "warning" : "success"}
        />
      </div>

      {issues.length === 0 && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
          Kontrollen er grøn og fandt ingen fejl eller advarsler i forslaget.
        </div>
      )}

      <ShiftPlanningIssueActionSummary hints={actionHints} />

      {visibleIssues.length > 0 && (
        <div className="grid gap-3">
          {visibleIssues.map((issue, index) => (
            <ShiftPlanningDraftValidationIssueCard
              key={getValidationIssueKey(issue, index)}
              issue={issue}
            />
          ))}
        </div>
      )}

      {hiddenIssueCount > 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {hiddenIssueCount} flere kontrolpunkter er skjult i denne kompakte
          visning. Fejl og advarsler vises først.
        </p>
      )}
    </div>
  );
}
