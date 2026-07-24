import type {
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";

type JobFunction = {
  id: number;
  name: string;
};

type JobFunctionFormState = {
  jobFunctionId: string;
  requiredCount: string;
  sortOrder: string;
  note: string;
};

type ScheduleTemplateJobFunctionFormProps = {
  form: JobFunctionFormState;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  jobFunctions: JobFunction[];
  saving: boolean;
  onSubmit: (event: FormEvent) => void | Promise<void>;
};

const fieldClass =
  "mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/25 dark:disabled:bg-gray-800 dark:disabled:text-gray-500";

export default function ScheduleTemplateJobFunctionForm({
  form,
  setForm,
  jobFunctions,
  saving,
  onSubmit,
}: ScheduleTemplateJobFunctionFormProps) {
  return (
    <>
      <form
        className="mt-4 grid gap-3 lg:grid-cols-[1fr_130px_130px]"
        onSubmit={onSubmit}
      >
        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Jobfunktion
          <select
            value={form.jobFunctionId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                jobFunctionId: event.target.value,
              }))
            }
            className={fieldClass}
            disabled={saving || jobFunctions.length === 0}
          >
            <option value="">Vælg jobfunktion</option>
            {jobFunctions.map((jobFunction) => (
              <option key={jobFunction.id} value={jobFunction.id}>
                {jobFunction.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Antal vagter
          <input
            type="number"
            min="1"
            max="50"
            value={form.requiredCount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                requiredCount: event.target.value,
              }))
            }
            className={fieldClass}
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

        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 lg:col-span-3">
          Note
          <input
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            className={fieldClass}
            placeholder="Valgfri note til jobfunktionen i denne skabelon"
            disabled={saving}
          />
        </label>

        <button
          type="submit"
          className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-800 lg:col-span-3 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-blue-950 dark:disabled:text-blue-400"
          disabled={saving || jobFunctions.length === 0}
        >
          {saving ? "Tilføjer..." : "Tilføj jobfunktion"}
        </button>
      </form>

      {jobFunctions.length === 0 && (
        <p className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Der er ingen aktive jobfunktioner. Opret eller aktivér jobfunktioner
          før skabelonen kan bemandes.
        </p>
      )}
    </>
  );
}
