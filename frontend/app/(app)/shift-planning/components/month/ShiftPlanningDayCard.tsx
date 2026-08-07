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
  ShiftMonthOverviewShift,
  ShiftPlanningWorkingPreviewItem,
} from "../../helpers/shiftPlanningTypes";

type ShiftPlanningDayCardProps = {
  day: MonthPlanDay;
  template: ScheduleTemplateSummary | null;
  hasUnsavedChanges: boolean;
  updatingWorkingPreview: boolean;
  showPlanningLayer: boolean;
  onOpen: () => void;
};

const MAX_VISIBLE_JOB_FUNCTIONS = 3;
const MAX_VISIBLE_SCHEDULED_SHIFTS = 3;
const MAX_VISIBLE_WORKING_SHIFTS = 3;

function formatShiftTime(value: string | null) {
  if (!value) {
    return "Ukendt tid";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ukendt tid";
  }

  return new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(date);
}

function getScheduledShiftUserLabel(shift: ShiftMonthOverviewShift) {
  const name = [shift.user?.firstName, shift.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || shift.user?.email || "Uden medarbejder";
}

function getScheduledShiftJobFunctionLabel(shift: ShiftMonthOverviewShift) {
  return shift.jobFunction?.name ?? shift.jobFunctionNameSnapshot ?? "Vagt";
}

function getScheduledShiftColor(shift: ShiftMonthOverviewShift) {
  return shift.jobFunction?.color ?? shift.jobFunctionColorSnapshot ?? "#64748b";
}

function getWorkingShiftUserLabel(item: ShiftPlanningWorkingPreviewItem) {
  return item.userName || item.userEmail || "Uden medarbejder";
}

function getWorkingShiftStatus(item: ShiftPlanningWorkingPreviewItem) {
  if (item.canBecomeShift) {
    return {
      label: "Klar",
      classes:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200",
    };
  }

  const reasons = item.blockReasons.join(" ").toLocaleLowerCase("da-DK");
  if (reasons.includes("overstået")) {
    return {
      label: "Overstået",
      classes:
        "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    };
  }
  if (reasons.includes("allerede en vagt med samme jobfunktion")) {
    return {
      label: "Findes allerede",
      classes:
        "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200",
    };
  }

  return {
    label: "Problem",
    classes:
      "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200",
  };
}

export default function ShiftPlanningDayCard({
  day,
  template,
  hasUnsavedChanges,
  updatingWorkingPreview,
  showPlanningLayer,
  onOpen,
}: ShiftPlanningDayCardProps) {
  const dateKey = getMonthPlanDayDateKey(day);
  const statusDay = showPlanningLayer
    ? day
    : {
        ...day,
        scheduleTemplateId: null,
        scheduleTemplate: null,
        workingPreviewItems: [],
      };
  const displayTemplate = showPlanningLayer
    ? template ?? day.scheduleTemplate
    : null;
  const templateDay = day.isActive
    ? getTemplateDayForDate(displayTemplate, dateKey)
    : null;
  const dayNumberLabel = dateKey ? String(Number(dateKey.slice(-2))) : "?";
  const dayStatusLabel = getDayStatusLabel(statusDay);
  const showDayStatusLabel =
    dayStatusLabel !== "Afsluttet" && dayStatusLabel !== "I vagtplanen";
  const today = isToday(dateKey);
  const templateJobFunctions = templateDay?.jobFunctions ?? [];
  const scheduledShifts = day.scheduledShifts ?? [];
  const scheduledShiftCount = day.scheduledShiftCount ?? scheduledShifts.length;
  const workingPreviewItems = showPlanningLayer ? day.workingPreviewItems ?? [] : [];
  const hiddenScheduledShiftCount = Math.max(
    0,
    scheduledShiftCount - MAX_VISIBLE_SCHEDULED_SHIFTS,
  );
  const hiddenWorkingShiftCount = Math.max(
    0,
    workingPreviewItems.length - MAX_VISIBLE_WORKING_SHIFTS,
  );
  const weekParityWarning =
    showPlanningLayer && day.isActive
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
      className={`min-h-28 rounded-2xl border p-3 text-left text-xs shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 ${getDayStatusClasses(statusDay)} ${
        hasUnsavedChanges
          ? "ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white dark:ring-amber-500/80 dark:ring-offset-gray-950"
          : ""
      }`}
    >
      <div className="text-center">
        {(showDayStatusLabel || today || (showPlanningLayer && hasUnsavedChanges)) && (
          <div className="mb-1 flex items-center justify-center gap-1">
            {showDayStatusLabel && (
              <span className="max-w-full truncate rounded-full bg-white/80 px-2 py-0.5 text-center text-[10px] font-semibold text-gray-900 dark:bg-black/30 dark:text-white">
                {dayStatusLabel}
              </span>
            )}
            {today && (
              <span className="shrink-0 rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-blue-500 dark:text-blue-950">
                I dag
              </span>
            )}
            {showPlanningLayer && hasUnsavedChanges && (
              <span
                className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                title="Denne dato indeholder ændringer, som endnu ikke er gemt i kladden."
              >
                Ikke gemt
              </span>
            )}
          </div>
        )}
        <p className="text-sm font-bold uppercase leading-none tracking-wide">
          {getWeekdayName(dateKey)} {dayNumberLabel}
        </p>
      </div>

      <div className="mt-2 space-y-2">
        {showPlanningLayer && updatingWorkingPreview && (
          <p className="rounded-lg border border-violet-200 bg-violet-50/90 px-2 py-1 text-[10px] font-semibold text-violet-800 dark:border-violet-800 dark:bg-violet-950/45 dark:text-violet-200">
            Opdaterer forslag…
          </p>
        )}
        {scheduledShiftCount > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-2 text-blue-950 dark:border-blue-800 dark:bg-blue-950/45 dark:text-blue-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              {scheduledShiftCount} {scheduledShiftCount === 1 ? "vagt" : "vagter"}
            </p>
            <div className="mt-1.5 space-y-1">
              {scheduledShifts
                .slice(0, MAX_VISIBLE_SCHEDULED_SHIFTS)
                .map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-lg bg-white/80 px-2 py-1 dark:bg-black/25"
                  >
                    <p className="flex items-center gap-1 font-bold">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                        style={{ backgroundColor: getScheduledShiftColor(shift) }}
                      />
                      <span className="truncate">
                        {formatShiftTime(shift.startTime)}–
                        {formatShiftTime(shift.endTime)} ·{" "}
                        {getScheduledShiftJobFunctionLabel(shift)}
                      </span>
                    </p>
                    <p className="truncate opacity-80">
                      {getScheduledShiftUserLabel(shift)}
                    </p>
                  </div>
                ))}
              {hiddenScheduledShiftCount > 0 && (
                <p className="font-semibold opacity-80">
                  +{hiddenScheduledShiftCount} flere
                </p>
              )}
            </div>
          </div>
        )}

        {workingPreviewItems.length > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-2 text-violet-950 dark:border-violet-800 dark:bg-violet-950/45 dark:text-violet-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              Arbejdsforslag · {workingPreviewItems.length}{" "}
              {workingPreviewItems.length === 1 ? "vagt" : "vagter"}
            </p>
            <div className="mt-1.5 space-y-1">
              {workingPreviewItems
                .slice(0, MAX_VISIBLE_WORKING_SHIFTS)
                .map((item) => {
                  const status = getWorkingShiftStatus(item);
                  return (
                    <div
                      key={item.previewItemId}
                      className="rounded-lg bg-white/80 px-2 py-1 dark:bg-black/25"
                      title={item.blockReasons.join("\n") || "Klar til oprettelse"}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="flex min-w-0 items-center gap-1 font-bold">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                            style={{
                              backgroundColor:
                                item.jobFunctionColor ?? "#7c3aed",
                            }}
                          />
                          <span className="truncate">
                            {formatShiftTime(item.startTime)}–
                            {formatShiftTime(item.endTime)} ·{" "}
                            {item.jobFunctionName ?? "Vagt"}
                          </span>
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${status.classes}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="truncate opacity-80">
                        {getWorkingShiftUserLabel(item)}
                      </p>
                    </div>
                  );
                })}
              {hiddenWorkingShiftCount > 0 && (
                <p className="font-semibold opacity-80">
                  +{hiddenWorkingShiftCount} flere forslag
                </p>
              )}
            </div>
          </div>
        )}

        {showPlanningLayer && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
              Skabelon
            </p>
            <p className="line-clamp-2 text-[13px] font-bold" title={templateLabel}>
              {templateLabel}
            </p>
          </div>
        )}

        {weekParityWarning && (
          <p
            className="inline-flex rounded-md border border-amber-300 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
            title={weekParityWarning}
          >
            Tjek ugeopsætning
          </p>
        )}

        {workingPreviewItems.length === 0 && day.isActive && displayTemplate && (
          <div className="space-y-1.5">
            {templateJobFunctions.length === 0 ? (
              <p className="rounded-md border border-dashed border-current/30 bg-white/40 px-2 py-1 text-[11px] opacity-80 dark:bg-black/10">
                Ingen jobfunktioner på denne ugedag.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {templateJobFunctions
                  .slice(0, MAX_VISIBLE_JOB_FUNCTIONS)
                  .map((templateJobFunction) => (
                    <span
                      key={templateJobFunction.id}
                      className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/80 px-1.5 py-1 text-[11px] font-semibold text-gray-900 dark:bg-black/30 dark:text-white"
                      title={templateJobFunction.jobFunction.name}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                        style={{
                          backgroundColor:
                            templateJobFunction.jobFunction.color,
                        }}
                      />
                      <span className="truncate">
                        {templateJobFunction.jobFunction.name}
                      </span>
                      <span className="shrink-0 opacity-80">
                        × {templateJobFunction.requiredCount}
                      </span>
                    </span>
                  ))}
                {hiddenJobFunctionCount > 0 && (
                  <span className="rounded-md bg-white/80 px-1.5 py-1 text-[11px] font-semibold text-gray-800 dark:bg-black/30 dark:text-gray-100">
                    +{hiddenJobFunctionCount}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {showPlanningLayer && day.note && (
          <p className="truncate rounded-md bg-white/70 px-2 py-1 text-[11px] text-gray-800 dark:bg-black/30 dark:text-gray-100">
            {day.note}
          </p>
        )}
      </div>
    </button>
  );
}
