import {
  copyDayWeekdayLabels,
  formatCopyDayTargetStatus,
} from "../helpers/scheduleTemplateCopyDayModalText";
import type { CopyDayTargetOption } from "../helpers/scheduleTemplateCopyDayModalText";

type ScheduleTemplateCopyDayTargetsProps = {
  targetOptions: CopyDayTargetOption[];
  selectedTargets: number[];
  onToggleTarget: (weekday: number) => void;
  onSelectTargets: (weekdays: number[]) => void;
  onClearTargets: () => void;
};

export default function ScheduleTemplateCopyDayTargets({
  targetOptions,
  selectedTargets,
  onToggleTarget,
  onSelectTargets,
  onClearTargets,
}: ScheduleTemplateCopyDayTargetsProps) {
  return (
    <>
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
          onClick={() => onSelectTargets(copyDayWeekdayLabels.map((weekday) => weekday.value))}
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
                {formatCopyDayTargetStatus(day)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </>
  );
}
