import type { Dispatch, SetStateAction } from "react";

import type { ScheduleTemplateStaffingGapSummary } from "../helpers/scheduleTemplateStaffingGaps";

type DayFormState = {
  isActive: boolean;
  note: string;
  sortOrder: string;
};

type ScheduleTemplateDaySettingsProps = {
  weekdayLabel: string;
  hasSelectedDay: boolean;
  form: DayFormState;
  setForm: Dispatch<SetStateAction<DayFormState>>;
  gapSummary: ScheduleTemplateStaffingGapSummary;
  saving: boolean;
  copying: boolean;
  onSave: () => void;
  onCopyDay: () => void;
};

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

export default function ScheduleTemplateDaySettings({
  weekdayLabel,
  hasSelectedDay,
  form,
  setForm,
  gapSummary,
  saving,
  copying,
  onSave,
  onCopyDay,
}: ScheduleTemplateDaySettingsProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Ugedag
          </p>
          <h3 className="text-xl font-black">{weekdayLabel}</h3>
          {gapSummary.missingShiftCount > 0 && (
            <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">
              {formatOpenShiftText(gapSummary.missingShiftCount)} oprettes uden
              fast medarbejder på denne ugedag.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onCopyDay}
            className="rounded-2xl border border-blue-300 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950/40"
            disabled={!hasSelectedDay || copying}
          >
            Kopiér ugedag
          </button>
          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold dark:border-gray-800 dark:bg-gray-900">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            Aktiv ugedag i skabelonen
          </label>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_140px]">
        <label className="block text-sm font-semibold">
          Note
          <input
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Fx lukket dag eller særlig bemanding"
          />
        </label>
        <label className="block text-sm font-semibold">
          Sortering
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sortOrder: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onSave}
        className="mt-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Gemmer..." : "Gem ugedag"}
      </button>
    </div>
  );
}
