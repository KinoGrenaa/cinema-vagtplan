import { formatDateKey } from "../helpers/shiftPlanningHelpers";

import {
  formatCreatedAt,
  getDateKey,
  toNumber,
} from "../helpers/shiftPlanningDraftHelpers";
import type {
  DraftValidationIssue,
  DraftValidationResult,
} from "../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftValidationPanelProps = {
  errorMessage: string | null;
  result: DraftValidationResult | null;
};

const MAX_VISIBLE_VALIDATION_ISSUES = 20;

function formatIssueDate(issue: DraftValidationIssue) {
  const dateKey = getDateKey(issue.dateKey || issue.date || null);
  return dateKey ? formatDateKey(dateKey) : null;
}

function formatValidationActor(issue: DraftValidationIssue) {
  return issue.employeeName || issue.userName || null;
}

function getValidationSeverityLabel(severity?: string | null) {
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

function getValidationSeverityClasses(severity?: string | null) {
  switch ((severity || "").toUpperCase()) {
    case "ERROR":
      return "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100";
  }
}

function ValidationMetricCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number | string;
  variant?: "neutral" | "warning" | "error" | "success";
}) {
  const numericValue = Number(value);
  const shouldHighlightProblem =
    !Number.isFinite(numericValue) || numericValue > 0;

  const classes =
    variant === "error" && shouldHighlightProblem
      ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
      : variant === "warning" && shouldHighlightProblem
        ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
        : variant === "success"
          ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
          : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export function ShiftPlanningDraftValidationPanel({
  errorMessage,
  result,
}: ShiftPlanningDraftValidationPanelProps) {
  const validationSummary = result?.summary;
  const validationIssues = result?.issues ?? [];
  const visibleValidationIssues = validationIssues.slice(
    0,
    MAX_VISIBLE_VALIDATION_ISSUES,
  );
  const hiddenValidationIssueCount = Math.max(
    0,
    validationIssues.length - visibleValidationIssues.length,
  );

  return (
    <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900/70 dark:bg-gray-950/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950 dark:text-white">
            Backend-validering
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Kalder backendens sikre valideringsendpoint og kontrollerer kladden
            uden at oprette eller publicere vagter.
          </p>
        </div>
        {result?.checkedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Senest kontrolleret {formatCreatedAt(result.checkedAt)}
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
          {errorMessage}
        </div>
      )}

      {!result && !errorMessage && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Backend-validering er ikke kørt for den åbne kladde endnu.
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ValidationMetricCard
              label="Status"
              value={validationSummary?.isValid ? "OK" : "Stop"}
              variant={validationSummary?.isValid ? "success" : "error"}
            />
            <ValidationMetricCard
              label="Fejl"
              value={toNumber(validationSummary?.errorCount)}
              variant="error"
            />
            <ValidationMetricCard
              label="Advarsler"
              value={toNumber(validationSummary?.warningCount)}
              variant="warning"
            />
            <ValidationMetricCard
              label="Problemer"
              value={toNumber(validationSummary?.issueCount)}
              variant={
                toNumber(validationSummary?.issueCount) > 0
                  ? "warning"
                  : "success"
              }
            />
          </div>

          {validationIssues.length === 0 && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100">
              Backend-valideringen fandt ingen fejl eller advarsler i kladden.
            </div>
          )}

          {visibleValidationIssues.length > 0 && (
            <div className="grid gap-3">
              {visibleValidationIssues.map((issue, index) => {
                const issueDate = formatIssueDate(issue);
                const actor = formatValidationActor(issue);

                return (
                  <article
                    key={`${issue.code ?? "issue"}-${issue.itemId ?? issue.id ?? index}`}
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
                          Post #{issue.itemId}
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
                        {issue.jobFunctionName
                          ? `Jobfunktion: ${issue.jobFunctionName}`
                          : null}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {hiddenValidationIssueCount > 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {hiddenValidationIssueCount} flere valideringsproblemer er skjult
              i denne kompakte visning.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
