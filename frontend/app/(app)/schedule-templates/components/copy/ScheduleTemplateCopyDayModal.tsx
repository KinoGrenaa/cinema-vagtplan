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
  selectedDayGapSummary: ScheduleTemplateStaffingGapSummary;
  selectedDayStaffingSummary: ScheduleTemplateStaffingDaySummary;
  copying: boolean;
  onClose: () => void;
  onToggleTarget: (weekday: number) => void;
  onSelectTargets: (weekdays: number[]) => void;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-gray-900 dark:text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
              Kopiér ugedag
            </p>
            <h2 className="text-2xl font-black">
              Kopiér {formatCopyDayWeekday(sourceWeekday).toLowerCase()}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Modtagerdage ryddes først og får derefter samme jobfunktioner
              og faste medarbejdere.
            </p>
            <ScheduleTemplateCopyDaySummary
              selectedDayGapSummary={selectedDayGapSummary}
              selectedDayStaffingSummary={selectedDayStaffingSummary}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Luk
          </button>
        </div>

        <ScheduleTemplateCopyDayTargets
          targetOptions={targetOptions}
          selectedTargets={selectedTargets}
          onToggleTarget={onToggleTarget}
          onSelectTargets={onSelectTargets}
          onClearTargets={onClearTargets}
        />

        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={copying}
        >
          {copying
            ? "Kopierer..."
            : formatCopyDayTargetButtonText(selectedTargets.length)}
        </button>
      </div>
    </div>
  );
}
