import type { Dispatch, SetStateAction } from "react";

import type { JobFunctionFormState } from "../../helpers/form/jobFunctionFormHelpers";

type JobFunctionSortColorFieldsProps = {
  form: JobFunctionFormState;
  saving: boolean;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
};

export default function JobFunctionSortColorFields({
  form,
  saving,
  setForm,
}: JobFunctionSortColorFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Sortering
        </span>
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
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={saving}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Farve
        </span>
        <div className="mt-1">
          <input
            type="color"
            value={form.color}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                color: event.target.value,
              }))
            }
            className="h-12 w-full cursor-pointer rounded-xl border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-800"
            disabled={saving}
          />
        </div>
      </label>
    </div>
  );
}
