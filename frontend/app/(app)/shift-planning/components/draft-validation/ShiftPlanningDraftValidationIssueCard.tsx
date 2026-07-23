import {
  formatValidationActor,
  formatValidationIssueDate,
  getValidationSeverityClasses,
  getValidationSeverityLabel,
} from "../../helpers/shiftPlanningDraftValidationHelpers";
import {
  getDraftValidationIssueActionHint,
} from "../../helpers/shiftPlanningIssueActionHints";
import type {
  DraftValidationIssue,
} from "../../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftValidationIssueCardProps = {
  issue: DraftValidationIssue;
};

export function ShiftPlanningDraftValidationIssueCard({
  issue,
}: ShiftPlanningDraftValidationIssueCardProps) {
  const issueDate =
    formatValidationIssueDate(issue);
  const actor =
    formatValidationActor(issue);
  const actionHint =
    getDraftValidationIssueActionHint(
      issue,
    );

  return (
    <article
      className={`rounded-2xl border p-4 text-sm transition-colors ${getValidationSeverityClasses(
        issue.severity,
      )}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <span>
          {getValidationSeverityLabel(
            issue.severity,
          )}
        </span>

        {issue.code && (
          <span>{issue.code}</span>
        )}

        {issueDate && (
          <span>{issueDate}</span>
        )}

        {issue.itemId && (
          <span>
            Vagt #{issue.itemId}
          </span>
        )}
      </div>

      <p className="mt-2 font-medium">
        {issue.message ||
          issue.code ||
          "Ukendt valideringsproblem"}
      </p>

      {(actor ||
        issue.jobFunctionName) && (
        <p className="mt-2 text-xs opacity-80">
          {actor
            ? `Medarbejder: ${actor}`
            : null}
          {actor &&
          issue.jobFunctionName
            ? " · "
            : null}
          {issue.jobFunctionName
            ? `Jobfunktion: ${issue.jobFunctionName}`
            : null}
        </p>
      )}

      {actionHint && (
        <div className="mt-3 rounded-xl border border-current/20 bg-white/60 p-3 text-xs dark:bg-black/20">
          <span className="font-semibold">
            Næste handling:
          </span>{" "}
          <span>{actionHint.text}</span>

          {actionHint.href && (
            <a
              href={actionHint.href}
              className="ml-2 inline-flex rounded-full border border-current/30 px-2 py-0.5 font-semibold transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 dark:hover:bg-white/10 dark:focus-visible:ring-offset-gray-950"
            >
              {actionHint.linkLabel ??
                "Åbn"}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
