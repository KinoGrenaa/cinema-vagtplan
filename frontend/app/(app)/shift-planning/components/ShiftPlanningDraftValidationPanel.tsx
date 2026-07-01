import { ShiftPlanningDraftValidationIssueCard } from "./ShiftPlanningDraftValidationIssueCard";
import { ShiftPlanningDraftValidationMetricCard } from "./ShiftPlanningDraftValidationMetricCard";
import { formatCreatedAt, toNumber } from "../helpers/shiftPlanningDraftHelpers";
import {
  getValidationIssueKey,
  MAX_VISIBLE_VALIDATION_ISSUES,
} from "../helpers/shiftPlanningDraftValidationHelpers";
import type { DraftValidationResult } from "../helpers/shiftPlanningDraftTypes";

type ShiftPlanningDraftValidationPanelProps = {
  errorMessage: string | null;
  result: DraftValidationResult | null;
};

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
            <ShiftPlanningDraftValidationMetricCard
              label="Status"
              value={validationSummary?.isValid ? "OK" : "Stop"}
              variant={validationSummary?.isValid ? "success" : "error"}
            />
            <ShiftPlanningDraftValidationMetricCard
              label="Fejl"
              value={toNumber(validationSummary?.errorCount)}
              variant="error"
            />
            <ShiftPlanningDraftValidationMetricCard
              label="Advarsler"
              value={toNumber(validationSummary?.warningCount)}
              variant="warning"
            />
            <ShiftPlanningDraftValidationMetricCard
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
              {visibleValidationIssues.map((issue, index) => (
                <ShiftPlanningDraftValidationIssueCard
                  key={getValidationIssueKey(issue, index)}
                  issue={issue}
                />
              ))}
            </div>
          )}

          {hiddenValidationIssueCount > 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {hiddenValidationIssueCount} flere valideringsproblemer er skjult i
              denne kompakte visning.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
