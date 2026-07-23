import {
  copyDayWeekdayLabels,
  formatCopyDayTargetStatus,
} from "../../helpers/copy/scheduleTemplateCopyDayModalText";
import type { CopyDayTargetOption } from "../../helpers/copy/scheduleTemplateCopyDayModalText";

type ScheduleTemplateCopyDayTargetsProps = {
  targetOptions: CopyDayTargetOption[];
  selectedTargets: number[];
  onToggleTarget: (
    weekday: number,
  ) => void;
  onSelectTargets: (
    weekdays: number[],
  ) => void;
  onClearTargets: () => void;
};

const quickButtonClass =
  "rounded-2xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-900 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900";

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
          onClick={() =>
            onSelectTargets([
              1, 2, 3, 4, 5,
            ])
          }
          className={
            quickButtonClass
          }
        >
          Vælg hverdage
        </button>

        <button
          type="button"
          onClick={() =>
            onSelectTargets([6, 7])
          }
          className={
            quickButtonClass
          }
        >
          Vælg weekend
        </button>

        <button
          type="button"
          onClick={() =>
            onSelectTargets(
              copyDayWeekdayLabels.map(
                (weekday) =>
                  weekday.value,
              ),
            )
          }
          className={
            quickButtonClass
          }
        >
          Vælg alle
        </button>

        <button
          type="button"
          onClick={onClearTargets}
          className={
            quickButtonClass
          }
        >
          Ryd valg
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {targetOptions.map(
          ({ weekday, day }) => {
            const selected =
              selectedTargets.includes(
                weekday.value,
              );

            return (
              <label
                key={weekday.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm font-semibold transition focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900 ${
                  selected
                    ? "border-blue-400 bg-blue-50 text-blue-950 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
                    : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-100 dark:hover:bg-gray-950"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() =>
                    onToggleTarget(
                      weekday.value,
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 accent-blue-700 dark:border-gray-600 dark:accent-blue-400"
                />

                <span>
                  <span className="block">
                    {weekday.label}
                  </span>

                  <span className="mt-0.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {formatCopyDayTargetStatus(
                      day,
                    )}
                  </span>
                </span>
              </label>
            );
          },
        )}
      </div>
    </>
  );
}
