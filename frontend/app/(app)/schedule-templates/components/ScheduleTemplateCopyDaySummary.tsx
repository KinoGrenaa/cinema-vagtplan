import type {
  ScheduleTemplateStaffingDaySummary,
  ScheduleTemplateStaffingGapSummary,
} from "../helpers/scheduleTemplateStaffingGaps";
import {
  formatCopyDayFixedStaffingText,
  formatCopyDayJobFunctionText,
  formatCopyDayOpenShiftText,
  formatCopyDayShiftText,
} from "../helpers/scheduleTemplateCopyDayModalText";

type ScheduleTemplateCopyDaySummaryProps = {
  selectedDayGapSummary: ScheduleTemplateStaffingGapSummary;
  selectedDayStaffingSummary: ScheduleTemplateStaffingDaySummary;
};

export default function ScheduleTemplateCopyDaySummary({
  selectedDayGapSummary,
  selectedDayStaffingSummary,
}: ScheduleTemplateCopyDaySummaryProps) {
  return (
    <>
      {selectedDayGapSummary.missingShiftCount > 0 && (
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          {formatCopyDayOpenShiftText(
            selectedDayGapSummary.missingShiftCount,
          )}{" "}
          uden fast medarbejder kopieres også som åbne vagter, som
          medarbejderne kan ønske.
        </p>
      )}
      <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          Det kopieres
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
            {formatCopyDayShiftText(selectedDayStaffingSummary.shiftCount)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
            {formatCopyDayJobFunctionText(
              selectedDayStaffingSummary.jobFunctionCount,
            )}
          </span>
          <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
            {formatCopyDayFixedStaffingText(
              selectedDayStaffingSummary.assignedShiftCount,
            )}
          </span>
          {selectedDayStaffingSummary.openShiftCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              {formatCopyDayOpenShiftText(
                selectedDayStaffingSummary.openShiftCount,
              )}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
