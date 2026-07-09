import type { Dispatch, SetStateAction } from "react";

type WeekParity = "ANY" | "EVEN" | "ODD";

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

export default function ScheduleTemplateStamdataForm({
  form,
  setForm,
  saving,
  onSave,
}: ScheduleTemplateStamdataFormProps) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
        <label className="block text-sm font-semibold">
          Navn
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>

        <label className="block text-sm font-semibold">
          Ugeregel
          <select
            value={form.weekParity}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                weekParity: event.target.value as WeekParity,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="ANY">Alle uger</option>
            <option value="EVEN">Kun lige uger</option>
            <option value="ODD">Kun ulige uger</option>
          </select>
        </label>

        <label className="block text-sm font-semibold lg:col-span-2">
          Beskrivelse
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="mt-1 min-h-20 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="mt-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Gemmer..." : "Gem stamdata"}
      </button>
    </div>
  );
}
