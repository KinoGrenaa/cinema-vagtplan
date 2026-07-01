import {
  formatTemplateLabel,
  getDayStatusClasses,
  getDayStatusLabel,
  getMonthPlanDayDateKey,
  getTemplateDayAssignedCount,
  getTemplateDayForDate,
  getTemplateDayRequiredCount,
  getTemplateWeekParityWarning,
  getWeekdayName,
  isToday,
} from "../../helpers/shiftPlanningHelpers";
import type {
  MonthPlanDay,
  ScheduleTemplateSummary,
} from "../../helpers/shiftPlanningTypes";

type ShiftPlanningDayCardProps = {
  day: MonthPlanDay;
  template: ScheduleTemplateSummary | null;
  onOpen: () => void;
};

const MAX_VISIBLE_JOB_FUNCTIONS = 2;

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
  const templateLabel = day.isActive
    ? formatTemplateLabel(displayTemplate)
    : "Lukket / ingen plan";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`min-h-32 rounded-2xl border p-2.5 text-left text-xs transition hover:shadow-md ${getDayStatusClasses(
        day,
      )}`}
    >
      <div className="space-y-1 text-center">
        <div className="flex min-h-5 items-center justify-center gap-1">
          <span className="max-w-full truncate rounded-full bg-white/70 px-2 py-0.5 text-center text-[10px] font-semibold dark:bg-black/20">
            {getDayStatusLabel(day)}
          </span>
          {isToday(dateKey) && (
            <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              I dag
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
          {getWeekdayName(dateKey)}
        </p>
        <p className="text-2xl font-bold leading-none">{dayNumberLabel}</p>
      </div>

      <div className="mt-2 space-y-1.5">
        <p className="line-clamp-2 text-[13px] font-semibold" title={templateLabel}>
          {templateLabel}
        </p>

        {weekParityWarning && (
          <p
            className="inline-flex rounded-md border border-amber-300 bg-amber-50/80 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
            title={weekParityWarning}
          >
            Tjek ugeparitet
          </p>
        )}

        {day.isActive && displayTemplate && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-semibold">
              <span className="rounded-md bg-white/70 px-1.5 py-1 dark:bg-black/20">
                {templateJobFunctions.length} funkt.
              </span>
              <span className="rounded-md bg-white/70 px-1.5 py-1 dark:bg-black/20">
                {requiredCount} vagter
              </span>
              <span className="rounded-md bg-white/70 px-1.5 py-1 dark:bg-black/20">
                {assignedCount} stand.
              </span>
            </div>

            {templateJobFunctions.length === 0 ? (
              <p className="truncate rounded-md border border-dashed border-current/30 px-2 py-1 text-[11px] opacity-75">
                Skabelonen har ingen jobfunktioner for denne ugedag.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {templateJobFunctions
                  .slice(0, MAX_VISIBLE_JOB_FUNCTIONS)
                  .map((templateJobFunction) => (
                    <span
                      key={templateJobFunction.id}
                      className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/70 px-1.5 py-1 text-[11px] font-semibold dark:bg-black/20"
                      title={templateJobFunction.jobFunction.name}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: templateJobFunction.jobFunction.color,
                        }}
                      />
                      <span className="truncate">
                        {templateJobFunction.jobFunction.name}
                      </span>
                      <span className="shrink-0 opacity-75">
                        {templateJobFunction.requiredCount}
                      </span>
                    </span>
                  ))}

                {hiddenJobFunctionCount > 0 && (
                  <span className="rounded-md bg-white/70 px-1.5 py-1 text-[11px] font-semibold opacity-80 dark:bg-black/20">
                    +{hiddenJobFunctionCount}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <p className="truncate text-[11px] opacity-80">
          {day.movieShowingCount ?? 0} forest. · {day.plannedShiftCount ?? 0}{" "}
          vagter · {day.unassignedShiftCount ?? 0} ubesatte
        </p>

        {day.note && (
          <p className="truncate rounded-md bg-white/60 px-2 py-1 text-[11px] dark:bg-black/20">
            {day.note}
          </p>
        )}
      </div>
    </button>
  );
}
