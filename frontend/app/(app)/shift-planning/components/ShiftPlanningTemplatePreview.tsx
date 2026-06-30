import {
  formatTemplateLabel,
  getTemplateDayAssignedCount,
  getTemplateDayForDate,
  getTemplateDayRequiredCount,
  getTemplateWeekParityWarning,
  getUserDisplayName,
  getWeekdayName,
} from "../helpers/shiftPlanningHelpers";
import type {
  ScheduleTemplateJobFunctionSummary,
  ScheduleTemplateSummary,
} from "../helpers/shiftPlanningTypes";

type ShiftPlanningTemplatePreviewProps = {
  dateKey: string;
  isActive: boolean;
  template: ScheduleTemplateSummary | null;
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

export default function ShiftPlanningTemplatePreview({
  dateKey,
  isActive,
  template,
}: ShiftPlanningTemplatePreviewProps) {
  if (!isActive) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
        Dagen er markeret som inaktiv. Der bruges derfor ingen vagtsskabelon på
        denne dato.
      </section>
    );
  }

  if (!template) {
    return (
      <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
        Vælg en vagtsskabelon for at se, hvilke jobfunktioner og
        standardmedarbejdere der ligger på denne ugedag.
      </section>
    );
  }

  const templateDay = getTemplateDayForDate(template, dateKey);
  const templateJobFunctions = templateDay?.jobFunctions ?? [];
  const requiredCount = getTemplateDayRequiredCount(templateDay);
  const assignedCount = getTemplateDayAssignedCount(templateDay);
  const weekdayName = getWeekdayName(dateKey, "long");
  const weekParityWarning = getTemplateWeekParityWarning(template, dateKey);

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Preview fra valgt skabelon
          </p>
          <h3 className="mt-1 text-base font-bold text-gray-950 dark:text-white">
            {formatTemplateLabel(template)}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Viser skabelonens aktive opsætning for {weekdayName}.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">
          <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {templateJobFunctions.length}
            <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
              funktioner
            </span>
          </span>
          <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {requiredCount}
            <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
              vagter
            </span>
          </span>
          <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {assignedCount}
            <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
              standard
            </span>
          </span>
        </div>
      </div>

      {weekParityWarning && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Ugeadvarsel: {weekParityWarning}
        </p>
      )}

      {!templateDay && (
        <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Skabelonen har ingen aktiv opsætning for {weekdayName}. Denne dato får
          derfor ingen planlagte jobfunktioner fra skabelonen endnu.
        </p>
      )}

      {templateDay && templateJobFunctions.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          Ugedagen er aktiv i skabelonen, men der er ikke lagt jobfunktioner på
          den endnu.
        </p>
      )}

      {templateJobFunctions.length > 0 && (
        <div className="mt-4 space-y-2">
          {templateJobFunctions.map((templateJobFunction) => {
            const assignmentNames = getAssignmentNames(templateJobFunction);
            const dayPeriodName = templateJobFunction.jobFunction.dayPeriod?.name;

            return (
              <article
                key={templateJobFunction.id}
                className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
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
                  </span>
                  {assignmentNames.length > 0
                    ? assignmentNames.join(", ")
                    : "Ingen valgt"}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
