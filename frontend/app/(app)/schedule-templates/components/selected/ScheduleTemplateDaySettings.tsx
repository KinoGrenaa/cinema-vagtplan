import type {
  Dispatch,
  SetStateAction,
} from "react";

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
  saving: boolean;
  copying: boolean;
  onSave: () => void;
  onCopyDay: () => void;
};

const fieldClass =
  "mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25";

export default function ScheduleTemplateDaySettings({
  weekdayLabel,
  hasSelectedDay,
  form,
  setForm,
  saving,
  copying,
  onSave,
  onCopyDay,
}: ScheduleTemplateDaySettingsProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-black text-gray-950 dark:text-white">
            {weekdayLabel}
          </h3>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onCopyDay}
            className="rounded-2xl border border-blue-300 bg-white px-4 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-50 active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-50 disabled:text-blue-400 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-200 dark:hover:bg-blue-950/40 dark:active:bg-blue-950/70 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:border-blue-950 dark:disabled:bg-blue-950/20 dark:disabled:text-blue-500"
            disabled={!hasSelectedDay || copying}
          >
            {copying ? "Kopierer..." : "Kopiér dag"}
          </button>

          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-gray-600 dark:accent-blue-400 dark:focus-visible:ring-blue-400"
            />
            Aktiv ugedag
          </label>
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Bemærkning
          <input
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            className={fieldClass}
            placeholder="Fx lukket dag eller særlig bemanding"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="mt-3 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
        disabled={saving}
      >
        {saving ? "Gemmer..." : "Gem dag"}
      </button>
    </div>
  );
}
