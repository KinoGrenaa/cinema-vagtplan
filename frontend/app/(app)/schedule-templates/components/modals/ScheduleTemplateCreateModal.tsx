import type {
  Dispatch,
  FormEvent,
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

type ScheduleTemplateCreateModalProps = {
  form: TemplateFormState;
  setForm: Dispatch<SetStateAction<TemplateFormState>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

const fieldClass =
  "mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

export default function ScheduleTemplateCreateModal({
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: ScheduleTemplateCreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 text-gray-950 shadow-2xl transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
              Ny skabelon
            </p>
            <h2 className="text-2xl font-black">Opret vagtsskabelon</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Luk
          </button>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
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
              autoFocus
              disabled={saving}
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
              disabled={saving}
            >
              <option value="ANY">Alle uger</option>
              <option value="EVEN">Kun lige uger</option>
              <option value="ODD">Kun ulige uger</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
            Beskrivelse
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={`${fieldClass} min-h-24`}
              disabled={saving}
            />
          </label>

          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
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
              className={fieldClass}
              disabled={saving}
            />
          </label>

          <button
            type="submit"
            className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
            disabled={saving}
          >
            {saving ? "Opretter..." : "Opret vagtsskabelon"}
          </button>
        </form>
      </div>
    </div>
  );
}
