import { getUserDisplayName } from "../../helpers/shiftPlanningHelpers";
import type { ScheduleTemplateJobFunctionSummary } from "../../helpers/shiftPlanningTypes";

type ShiftPlanningTemplatePreviewJobFunctionCardProps = {
  templateJobFunction: ScheduleTemplateJobFunctionSummary;
};

function formatRequiredCount(count: number) {
  return count === 1 ? "1 vagt" : `${count} vagter`;
}

function getAssignmentNames(
  templateJobFunction: ScheduleTemplateJobFunctionSummary,
) {
  return (templateJobFunction.assignments ?? []).map((assignment) =>
    getUserDisplayName(assignment.user),
  );
}

export function ShiftPlanningTemplatePreviewJobFunctionCard({
  templateJobFunction,
}: ShiftPlanningTemplatePreviewJobFunctionCardProps) {
  const assignmentNames = getAssignmentNames(templateJobFunction);
  const dayPeriodName = templateJobFunction.jobFunction.dayPeriod?.name;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: templateJobFunction.jobFunction.color,
              }}
            />
            <h4 className="truncate text-sm font-bold text-gray-950 dark:text-white">
              {templateJobFunction.jobFunction.name}
            </h4>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span>{formatRequiredCount(templateJobFunction.requiredCount)}</span>
            {dayPeriodName && <span>· {dayPeriodName}</span>}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
          {templateJobFunction.requiredCount} stk.
        </span>
      </div>

      {templateJobFunction.note && (
        <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-950/60 dark:text-gray-300">
          {templateJobFunction.note}
        </p>
      )}

      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
        <span className="font-semibold text-gray-800 dark:text-gray-100">
          Standardmedarbejdere:
        </span>{" "}
        {assignmentNames.length > 0 ? assignmentNames.join(", ") : "Ingen valgt"}
      </div>
    </article>
  );
}
