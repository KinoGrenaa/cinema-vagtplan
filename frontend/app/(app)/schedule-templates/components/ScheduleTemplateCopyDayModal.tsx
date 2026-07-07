import type {
  ScheduleTemplateStaffingDay,
  ScheduleTemplateStaffingDaySummary,
  ScheduleTemplateStaffingGapSummary,
} from "../helpers/scheduleTemplateStaffingGaps";
import { summarizeTemplateDayStaffing } from "../helpers/scheduleTemplateStaffingGaps";

type WeekdayOption = {
  value: number;
  shortLabel: string;
  label: string;
};

type CopyDayTargetOption = {
  weekday: WeekdayOption;
  day: ScheduleTemplateStaffingDay | null;
};

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

const weekdayLabels = [
  { value: 1, label: "Mandag" },
  { value: 2, label: "Tirsdag" },
  { value: 3, label: "Onsdag" },
  { value: 4, label: "Torsdag" },
  { value: 5, label: "Fredag" },
  { value: 6, label: "Lørdag" },
  { value: 7, label: "Søndag" },
];

function formatWeekday(value: number) {
  return (
    weekdayLabels.find((weekday) => weekday.value === value)?.label ??
    "Ukendt dag"
  );
}

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

function formatShiftText(shiftCount: number) {
  if (shiftCount === 1) return "1 vagt";
  return `${shiftCount} vagter`;
}

function formatFixedStaffingText(assignedShiftCount: number) {
  if (assignedShiftCount === 1) return "1 fast medarbejder";
  return `${assignedShiftCount} faste medarbejdere`;
}

function formatJobFunctionText(jobFunctionCount: number) {
  if (jobFunctionCount === 1) return "1 jobfunktion";
  return `${jobFunctionCount} jobfunktioner`;
}

function formatCopyTargetButtonText(targetCount: number) {
  if (targetCount === 0) return "Kopiér til valgte dage";
  if (targetCount === 1) return "Kopiér til 1 valgt dag";
  return `Kopiér til ${targetCount} valgte dage`;
}

function formatCopyTargetStatus(day: ScheduleTemplateStaffingDay | null) {
  const summary = summarizeTemplateDayStaffing(day);

  if (summary.shiftCount === 0) {
    return "Tom modtagerdag";
  }

  const openShiftLabel = summary.openShiftCount > 0
    ? ` · ${formatOpenShiftText(summary.openShiftCount)}`
    : "";

  return `${formatShiftText(summary.shiftCount)} erstattes${openShiftLabel}`;
}

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
              Kopiér {formatWeekday(sourceWeekday).toLowerCase()}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Modtagerdage ryddes først og får derefter samme jobfunktioner
              og faste medarbejdere.
            </p>
            {selectedDayGapSummary.missingShiftCount > 0 && (
              <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                {formatOpenShiftText(
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
                  {formatShiftText(selectedDayStaffingSummary.shiftCount)}
                </span>
                <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                  {formatJobFunctionText(
                    selectedDayStaffingSummary.jobFunctionCount,
                  )}
                </span>
                <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                  {formatFixedStaffingText(
                    selectedDayStaffingSummary.assignedShiftCount,
                  )}
                </span>
                {selectedDayStaffingSummary.openShiftCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                    {formatOpenShiftText(
                      selectedDayStaffingSummary.openShiftCount,
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Luk
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectTargets([1, 2, 3, 4, 5])}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Vælg hverdage
          </button>
          <button
            type="button"
            onClick={() => onSelectTargets([6, 7])}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Vælg weekend
          </button>
          <button
            type="button"
            onClick={() => onSelectTargets(weekdayLabels.map((weekday) => weekday.value))}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Vælg alle
          </button>
          <button
            type="button"
            onClick={onClearTargets}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Ryd valg
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {targetOptions.map(({ weekday, day }) => (
            <label
              key={weekday.value}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 p-3 text-sm font-semibold dark:border-gray-800"
            >
              <input
                type="checkbox"
                checked={selectedTargets.includes(weekday.value)}
                onChange={() => onToggleTarget(weekday.value)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className="block">{weekday.label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {formatCopyTargetStatus(day)}
                </span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={copying}
        >
          {copying
            ? "Kopierer..."
            : formatCopyTargetButtonText(selectedTargets.length)}
        </button>
      </div>
    </div>
  );
}
