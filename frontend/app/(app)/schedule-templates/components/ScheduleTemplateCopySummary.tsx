import type {
  TemplateCopyDaySummary,
  TemplateStaffingSummary,
} from "../helpers/scheduleTemplateCopy";
import {
  formatTemplateCopyDayDetail,
  formatTemplateCopyFixedStaffingText,
  formatTemplateCopyJobFunctionText,
  formatTemplateCopyOpenShiftText,
  formatTemplateCopyShiftText,
  formatTemplateCopyWeekday,
  formatTemplateCopyWeekdayCountText,
} from "../helpers/scheduleTemplateCopyModalText";

type ScheduleTemplateCopySummaryProps = {
  staffingSummary: TemplateStaffingSummary;
  copiedOpenShiftCount: number;
  daySummaries: TemplateCopyDaySummary[];
  includeAssignments: boolean;
  includeNotes: boolean;
  hasNoDays: boolean;
};

export default function ScheduleTemplateCopySummary({
  staffingSummary,
  copiedOpenShiftCount,
  daySummaries,
  includeAssignments,
  includeNotes,
  hasNoDays,
}: ScheduleTemplateCopySummaryProps) {
  return (
    <>
      <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          Det kopieres
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
            {formatTemplateCopyWeekdayCountText(staffingSummary.dayCount)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
            {formatTemplateCopyShiftText(staffingSummary.shiftCount)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
            {formatTemplateCopyJobFunctionText(staffingSummary.jobFunctionCount)}
          </span>
          {includeAssignments ? (
            <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
              {formatTemplateCopyFixedStaffingText(
                staffingSummary.assignedShiftCount,
              )}
            </span>
          ) : (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
              Faste medarbejdere kopieres ikke
            </span>
          )}
          {copiedOpenShiftCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              {formatTemplateCopyOpenShiftText(copiedOpenShiftCount)}
            </span>
          )}
          {!includeNotes && (
            <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
              Noter kopieres ikke
            </span>
          )}
        </div>
      </div>

      {hasNoDays && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Kopien har ingen ugedage lige nu. Slå inaktive ugedage til igen,
          eller vælg en skabelon med aktive ugedage.
        </div>
      )}

      {daySummaries.length > 0 && (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            Ugedage i kopien
          </p>
          <div className="mt-2 space-y-2">
            {daySummaries.map((daySummary) => (
              <div
                key={daySummary.weekday}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2 dark:bg-gray-900"
              >
                <div>
                  <p className="font-black text-gray-950 dark:text-white">
                    {formatTemplateCopyWeekday(daySummary.weekday)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatTemplateCopyDayDetail(
                      daySummary,
                      includeAssignments,
                    )}
                  </p>
                </div>
                {!daySummary.isActive && (
                  <span className="rounded-full bg-gray-200 px-3 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Inaktiv
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
