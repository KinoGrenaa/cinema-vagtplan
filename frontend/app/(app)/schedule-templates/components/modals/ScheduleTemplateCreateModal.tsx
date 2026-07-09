import type { Dispatch, FormEvent, SetStateAction } from "react";

type WeekParity = "ANY" | "EVEN" | "ODD";

type TemplateFormState = {
  name: string;
  description: string;
  weekParity: WeekParity;
  sortOrder: string;
};

type ScheduleTemplateCreateModalProps = {
  form: TemplateFormState;
  setForm: Dispatch<SetStateAction<TemplateFormState>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export default function ScheduleTemplateCreateModal({
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: ScheduleTemplateCreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-gray-900 dark:text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
              Ny skabelon
            </p>
            <h2 className="text-2xl font-black">Opret vagtsskabelon</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Luk
          </button>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
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
              autoFocus
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
          <label className="block text-sm font-semibold">
            Beskrivelse
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="mt-1 min-h-24 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
          <button
            type="submit"
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Opretter..." : "Opret vagtsskabelon"}
          </button>
        </form>
      </div>
    </div>
  );
}
