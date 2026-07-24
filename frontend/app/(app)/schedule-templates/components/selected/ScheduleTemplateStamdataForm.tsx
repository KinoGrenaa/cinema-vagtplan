import type {
  Dispatch,
  SetStateAction,
} from "react";

type WeekParity =
  | "ANY"
  | "EVEN"
  | "ODD";

type TemplateFormState = {
  name: string;
  description: string;
  weekParity: WeekParity;
  sortOrder: string;
};

type ScheduleTemplateStamdataFormProps = {
  form: TemplateFormState;
  setForm: Dispatch<SetStateAction<TemplateFormState>>;
  saving: boolean;
  onSave: () => void;
};

const fieldClass =
  "mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25";

export default function ScheduleTemplateStamdataForm({
  form,
  setForm,
  saving,
  onSave,
}: ScheduleTemplateStamdataFormProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
      <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Navn
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className={fieldClass}
          />
        </label>

        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Ugeregel
          <select
            value={form.weekParity}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                weekParity: event.target.value as WeekParity,
              }))
            }
            className={fieldClass}
          >
            <option value="ANY">Alle uger</option>
            <option value="EVEN">Kun lige uger</option>
            <option value="ODD">Kun ulige uger</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 lg:col-span-2">
          Beskrivelse
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className={`${fieldClass} min-h-20`}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="mt-3 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
        disabled={saving}
      >
        {saving ? "Gemmer..." : "Gem stamdata"}
      </button>
    </div>
  );
}
