import {
  formatTemplateLabel,
  getDayStatusClasses,
  getDayStatusLabel,
  getMonthPlanDayDateKey,
  getTemplateDayForDate,
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

const MAX_VISIBLE_JOB_FUNCTIONS = 3;

export default function ShiftPlanningDayCard({
  day,
  template,
  onOpen,
}: ShiftPlanningDayCardProps) {
  const dateKey =
    getMonthPlanDayDateKey(day);
  const displayTemplate =
    template ?? day.scheduleTemplate;
  const templateDay = day.isActive
    ? getTemplateDayForDate(
        displayTemplate,
        dateKey,
      )
    : null;
  const dayNumberLabel = dateKey
    ? String(
        Number(dateKey.slice(-2)),
      )
    : "?";
  const templateJobFunctions =
    templateDay?.jobFunctions ?? [];
  const weekParityWarning =
    day.isActive
      ? getTemplateWeekParityWarning(
          displayTemplate,
          dateKey,
        )
      : null;
  const hiddenJobFunctionCount =
    Math.max(
      0,
      templateJobFunctions.length -
        MAX_VISIBLE_JOB_FUNCTIONS,
    );
  const templateLabel = day.isActive
    ? formatTemplateLabel(
        displayTemplate,
      )
    : "Lukket / ingen plan";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`min-h-32 rounded-2xl border p-3 text-left text-xs shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 ${getDayStatusClasses(
        day,
      )}`}
    >
      <div className="space-y-1 text-center">
        <div className="flex min-h-5 items-center justify-center gap-1">
          <span className="max-w-full truncate rounded-full bg-white/80 px-2 py-0.5 text-center text-[10px] font-semibold text-gray-900 dark:bg-black/30 dark:text-white">
            {getDayStatusLabel(day)}
          </span>

          {isToday(dateKey) && (
            <span className="shrink-0 rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-blue-500 dark:text-blue-950">
              I dag
            </span>
          )}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
          {getWeekdayName(dateKey)}
        </p>

        <p className="text-2xl font-bold leading-none">
          {dayNumberLabel}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {day.isActive &&
        displayTemplate ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
              Anvendt skabelon
            </p>

            <p
              className="line-clamp-2 text-[13px] font-bold"
              title={templateLabel}
            >
              {templateLabel}
            </p>
          </div>
        ) : (
          <p
            className="line-clamp-2 text-[13px] font-semibold"
            title={templateLabel}
          >
            {templateLabel}
          </p>
        )}

        {weekParityWarning && (
          <p
            className="inline-flex rounded-md border border-amber-300 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
            title={weekParityWarning}
          >
            Tjek ugeopsætning
          </p>
        )}

        {day.isActive &&
          displayTemplate && (
            <div className="space-y-1.5">
              {templateJobFunctions.length ===
              0 ? (
                <p className="rounded-md border border-dashed border-current/30 bg-white/40 px-2 py-1 text-[11px] opacity-80 dark:bg-black/10">
                  Ingen jobfunktioner på
                  denne ugedag.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {templateJobFunctions
                    .slice(
                      0,
                      MAX_VISIBLE_JOB_FUNCTIONS,
                    )
                    .map(
                      (
                        templateJobFunction,
                      ) => (
                        <span
                          key={
                            templateJobFunction.id
                          }
                          className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/80 px-1.5 py-1 text-[11px] font-semibold text-gray-900 dark:bg-black/30 dark:text-white"
                          title={
                            templateJobFunction
                              .jobFunction
                              .name
                          }
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                            style={{
                              backgroundColor:
                                templateJobFunction
                                  .jobFunction
                                  .color,
                            }}
                          />

                          <span className="truncate">
                            {
                              templateJobFunction
                                .jobFunction
                                .name
                            }
                          </span>

                          <span className="shrink-0 opacity-80">
                            ×{" "}
                            {
                              templateJobFunction.requiredCount
                            }
                          </span>
                        </span>
                      ),
                    )}

                  {hiddenJobFunctionCount >
                    0 && (
                    <span className="rounded-md bg-white/80 px-1.5 py-1 text-[11px] font-semibold text-gray-800 dark:bg-black/30 dark:text-gray-100">
                      +
                      {
                        hiddenJobFunctionCount
                      }
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

        {day.note && (
          <p className="truncate rounded-md bg-white/70 px-2 py-1 text-[11px] text-gray-800 dark:bg-black/30 dark:text-gray-100">
            {day.note}
          </p>
        )}
      </div>
    </button>
  );
}
