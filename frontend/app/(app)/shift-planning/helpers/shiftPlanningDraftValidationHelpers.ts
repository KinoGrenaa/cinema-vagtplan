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

export function getValidationSeverityRank(severity?: string | null) {
  switch ((severity || "").toUpperCase()) {
    case "ERROR":
      return 0;
    case "WARNING":
      return 1;
    case "INFO":
      return 2;
    default:
      return 3;
  }
}

function getValidationIssueSortDateKey(issue: DraftValidationIssue) {
  return getDateKey(issue.dateKey || issue.date || null) ?? "";
}

function compareOptionalText(first: unknown, second: unknown) {
  const firstText = first == null ? "" : String(first);
  const secondText = second == null ? "" : String(second);
  return firstText.localeCompare(secondText, "da-DK", {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortValidationIssuesBySeverity(
  issues: DraftValidationIssue[],
) {
  return [...issues].sort((firstIssue, secondIssue) => {
    const severityDifference =
      getValidationSeverityRank(firstIssue.severity) -
      getValidationSeverityRank(secondIssue.severity);

    if (severityDifference !== 0) {
      return severityDifference;
    }

    const dateDifference = compareOptionalText(
      getValidationIssueSortDateKey(firstIssue),
      getValidationIssueSortDateKey(secondIssue),
    );

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return compareOptionalText(firstIssue.itemId ?? firstIssue.id, secondIssue.itemId ?? secondIssue.id);
  });
}
