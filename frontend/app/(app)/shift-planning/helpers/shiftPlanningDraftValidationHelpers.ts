import { getDateKey } from "./shiftPlanningDraftHelpers";
import { formatDateKey } from "./shiftPlanningHelpers";
import type { DraftValidationIssue } from "./shiftPlanningDraftTypes";

export const MAX_VISIBLE_VALIDATION_ISSUES = 20;

export function formatValidationIssueDate(issue: DraftValidationIssue) {
  const dateKey = getDateKey(issue.dateKey || issue.date || null);

  return dateKey ? formatDateKey(dateKey) : null;
}

export function formatValidationActor(issue: DraftValidationIssue) {
  return issue.employeeName || issue.userName || null;
}

export function getValidationSeverityLabel(severity?: string | null) {
  switch ((severity || "").toUpperCase()) {
    case "ERROR":
      return "Fejl";
    case "WARNING":
      return "Advarsel";
    case "INFO":
      return "Info";
    default:
      return severity || "Kontrol";
  }
}

export function getValidationSeverityClasses(severity?: string | null) {
  switch ((severity || "").toUpperCase()) {
    case "ERROR":
      return "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100";
  }
}

export function getValidationIssueKey(
  issue: DraftValidationIssue,
  index: number,
) {
  return `${issue.code ?? "issue"}-${issue.itemId ?? issue.id ?? index}`;
}
