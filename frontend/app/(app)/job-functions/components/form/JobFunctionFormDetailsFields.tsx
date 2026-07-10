import type { Dispatch, SetStateAction } from "react";
import type { JobFunctionFormState } from "../../helpers/form/jobFunctionFormHelpers";

type JobFunctionFormDetailsFieldsProps = {
  form: JobFunctionFormState;
  saving: boolean;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
};

export default function JobFunctionFormDetailsFields({
  form,
  saving,
  setForm,
}: JobFunctionFormDetailsFieldsProps) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Navn
        </span>
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={saving}
          autoFocus
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Beskrivelse
        </span>
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          className="mt-1 min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={saving}
        />
      </label>
    </>
  );
}
