import type {
  ScheduleTemplateStaffingDaySummary,
  ScheduleTemplateStaffingGapSummary,
} from "../../helpers/page/scheduleTemplateStaffingGaps";
import ScheduleTemplateCopyDaySummary from "./ScheduleTemplateCopyDaySummary";
import ScheduleTemplateCopyDayTargets from "./ScheduleTemplateCopyDayTargets";
import type { CopyDayTargetOption } from "../../helpers/copy/scheduleTemplateCopyDayModalText";
import {
  formatCopyDayTargetButtonText,
  formatCopyDayWeekday,
} from "../../helpers/copy/scheduleTemplateCopyDayModalText";

type ScheduleTemplateCopyDayModalProps = {
  sourceWeekday: number;
  targetOptions: CopyDayTargetOption[];
  selectedTargets: number[];
  selectedDayGapSummary:
    ScheduleTemplateStaffingGapSummary;
  selectedDayStaffingSummary:
    ScheduleTemplateStaffingDaySummary;
  copying: boolean;
  onClose: () => void;
  onToggleTarget: (
    weekday: number,
  ) => void;
  onSelectTargets: (
    weekdays: number[],
  ) => void;
  onClearTargets: () => void;
  onSubmit: () => void;
};

export default function ScheduleTemplateCopyDayModal({
  sourceWeekday,
  targetOptions,
  selectedTargets,
  selectedDayGapSummary,
  selectedDayStaffingSummary,
  copying,
  onClose,
  onToggleTarget,
  onSelectTargets,
  onClearTargets,
  onSubmit,
}: ScheduleTemplateCopyDayModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 text-gray-950 shadow-2xl transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
              Kopiér ugedag
            </p>

            <h2 className="text-2xl font-black">
              Kopiér{" "}
              {formatCopyDayWeekday(
                sourceWeekday,
              ).toLowerCase()}
            </h2>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Modtagerdage ryddes først
              og får derefter samme
              jobfunktioner og faste
              medarbejdere.
            </p>

            <ScheduleTemplateCopyDaySummary
              selectedDayGapSummary={
                selectedDayGapSummary
              }
              selectedDayStaffingSummary={
                selectedDayStaffingSummary
              }
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Luk
          </button>
        </div>

        <ScheduleTemplateCopyDayTargets
          targetOptions={targetOptions}
          selectedTargets={
            selectedTargets
          }
          onToggleTarget={
            onToggleTarget
          }
          onSelectTargets={
            onSelectTargets
          }
          onClearTargets={
            onClearTargets
          }
        />

        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
          disabled={copying}
        >
          {copying
            ? "Kopierer..."
            : formatCopyDayTargetButtonText(
                selectedTargets.length,
              )}
        </button>
      </div>
    </div>
  );
}
