import {
  formatValidationActor,
  formatValidationIssueDate,
  getValidationSeverityClasses,
  getValidationSeverityLabel,
} from "../../helpers/shiftPlanningDraftValidationHelpers";
import type { DraftValidationIssue } from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftValidationIssueCardProps = {
  issue: DraftValidationIssue;
};

export function ShiftPlanningDraftValidationIssueCard({
  issue,
}: ShiftPlanningDraftValidationIssueCardProps) {
  const issueDate = formatValidationIssueDate(issue);
  const actor = formatValidationActor(issue);

  return (
    <article
      className={`rounded-2xl border p-4 text-sm ${getValidationSeverityClasses(
        issue.severity,
      )}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold dark:bg-gray-950/60">
          {getValidationSeverityLabel(issue.severity)}
        </span>
        {issue.code && (
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold dark:bg-gray-950/60">
            {issue.code}
          </span>
        )}
        {issueDate && (
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold dark:bg-gray-950/60">
            {issueDate}
          </span>
        )}
        {issue.itemId && (
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold dark:bg-gray-950/60">
            Vagt #{issue.itemId}
          </span>
        )}
      </div>

      <p className="mt-3 font-semibold">
        {issue.message || issue.code || "Ukendt valideringsproblem"}
      </p>

      {(actor || issue.jobFunctionName) && (
        <p className="mt-2 opacity-85">
          {actor ? `Medarbejder: ${actor}` : null}
          {actor && issue.jobFunctionName ? " · " : null}
          {issue.jobFunctionName ? `Jobfunktion: ${issue.jobFunctionName}` : null}
        </p>
      )}
    </article>
  );
}
