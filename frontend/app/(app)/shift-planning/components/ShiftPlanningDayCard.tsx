import {
  formatTemplateLabel,
  getDayStatusClasses,
  getDayStatusLabel,
  getMonthPlanDayDateKey,
  getTemplateDayAssignedCount,
  getTemplateDayForDate,
  getTemplateDayRequiredCount,
  getTemplateWeekParityWarning,
  getUserDisplayName,
  getWeekdayName,
  isToday,
} from "../helpers/shiftPlanningHelpers";
import type {
  MonthPlanDay,
  ScheduleTemplateJobFunctionSummary,
  ScheduleTemplateSummary,
} from "../helpers/shiftPlanningTypes";

type ShiftPlanningDayCardProps = {
  day: MonthPlanDay;
  template: ScheduleTemplateSummary | null;
  onOpen: () => void;
};

const MAX_VISIBLE_JOB_FUNCTIONS = 3;
const MAX_VISIBLE_STANDARD_EMPLOYEES = 2;

function getAssignmentText(
  templateJobFunction: ScheduleTemplateJobFunctionSummary,
) {
  const assignments = templateJobFunction.assignments ?? [];

  if (assignments.length === 0) {
    return null;
  }

  const visibleNames = assignments
    .slice(0, MAX_VISIBLE_STANDARD_EMPLOYEES)
    .map((assignment) => getUserDisplayName(assignment.user));
  const hiddenCount = assignments.length - visibleNames.length;

  if (hiddenCount > 0) {
    return `${visibleNames.join(", ")} +${hiddenCount} flere`;
  }

  return visibleNames.join(", ");
}

export default function ShiftPlanningDayCard({
  day,
  template,
  onOpen,
}: ShiftPlanningDayCardProps) {
  const dateKey = getMonthPlanDayDateKey(day);
  const displayTemplate = template ?? day.scheduleTemplate;
  const templateDay = day.isActive
    ? getTemplateDayForDate(displayTemplate, dateKey)
    : null;
  const dayNumberLabel = dateKey ? String(Number(dateKey.slice(-2))) : "?";
  const templateJobFunctions = templateDay?.jobFunctions ?? [];
  const requiredCount = getTemplateDayRequiredCount(templateDay);
  const assignedCount = getTemplateDayAssignedCount(templateDay);
  const weekParityWarning = day.isActive
    ? getTemplateWeekParityWarning(displayTemplate, dateKey)
    : null;
  const hiddenJobFunctionCount = Math.max(
    0,
    templateJobFunctions.length - MAX_VISIBLE_JOB_FUNCTIONS,
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`min-h-44 rounded-2xl border p-3 text-left transition hover:shadow-md ${getDayStatusClasses(
        day,
      )}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {getWeekdayName(dateKey)}
          </p>
          <p className="text-2xl font-bold">{dayNumberLabel}</p>
        </div>
        {isToday(dateKey) && (
          <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
            I dag
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <span className="inline-flex rounded-full bg-white/70 px-2 py-1 text-xs font-semibold dark:bg-black/20">
          {getDayStatusLabel(day)}
        </span>

        <p className="text-sm font-semibold">
          {day.isActive
            ? formatTemplateLabel(displayTemplate)
            : "Lukket / ingen plan"}
        </p>

        {weekParityWarning && (
          <p className="rounded-lg border border-amber-300 bg-amber-50/80 p-2 text-xs font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
            Ugeadvarsel: {weekParityWarning}
          </p>
        )}

        {day.isActive && displayTemplate && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1 text-center text-[11px] font-semibold">
              <span className="rounded-lg bg-white/70 px-2 py-1 dark:bg-black/20">
                {templateJobFunctions.length} funktioner
              </span>
              <span className="rounded-lg bg-white/70 px-2 py-1 dark:bg-black/20">
                {requiredCount} vagter
              </span>
              <span className="rounded-lg bg-white/70 px-2 py-1 dark:bg-black/20">
                {assignedCount} standard
              </span>
            </div>

            {templateJobFunctions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-current/30 p-2 text-xs opacity-75">
                Ingen jobfunktioner på denne ugedag i skabelonen.
              </p>
            ) : (
              <div className="space-y-1">
                {templateJobFunctions
                  .slice(0, MAX_VISIBLE_JOB_FUNCTIONS)
                  .map((templateJobFunction) => {
                    const assignmentText = getAssignmentText(templateJobFunction);

                    return (
                      <div
                        key={templateJobFunction.id}
                        className="rounded-lg bg-white/70 p-2 text-xs dark:bg-black/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 font-semibold">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  templateJobFunction.jobFunction.color,
                              }}
                            />
                            <span className="truncate">
                              {templateJobFunction.jobFunction.name}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold dark:bg-black/30">
                            {templateJobFunction.requiredCount} stk.
                          </span>
                        </div>
                        {assignmentText && (
                          <p className="mt-1 truncate opacity-75">
                            {assignmentText}
                          </p>
                        )}
                      </div>
                    );
                  })}

                {hiddenJobFunctionCount > 0 && (
                  <p className="rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold opacity-80 dark:bg-black/20">
                    +{hiddenJobFunctionCount} flere jobfunktioner
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs opacity-80">
          {day.movieShowingCount ?? 0} forest. · {day.plannedShiftCount ?? 0}{" "}
          vagter · {day.unassignedShiftCount ?? 0} ubesatte
        </p>

        {day.note && (
          <p className="line-clamp-2 rounded-lg bg-white/60 p-2 text-xs dark:bg-black/20">
            {day.note}
          </p>
        )}
      </div>
    </button>
  );
}
