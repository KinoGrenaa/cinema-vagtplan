import type { Dispatch, FormEvent, SetStateAction } from "react";

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
        <label className="block text-sm font-semibold">
          Jobfunktion
          <select
            value={form.jobFunctionId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                jobFunctionId: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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

        <label className="block text-sm font-semibold">
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
            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            disabled={saving}
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
            disabled={saving}
          />
        </label>

        <label className="block text-sm font-semibold lg:col-span-3">
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
            placeholder="Valgfri note til jobfunktionen i denne skabelon"
            disabled={saving}
          />
        </label>

        <button
          type="submit"
          className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 lg:col-span-3"
          disabled={saving || jobFunctions.length === 0}
        >
          {saving ? "Tilføjer..." : "Tilføj jobfunktion"}
        </button>
      </form>

      {jobFunctions.length === 0 && (
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Der er ingen aktive jobfunktioner. Opret eller aktivér jobfunktioner før
          skabelonen kan bemandes.
        </p>
      )}
    </>
  );
}
