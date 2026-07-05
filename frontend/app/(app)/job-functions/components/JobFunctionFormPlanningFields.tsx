import type { Dispatch, SetStateAction } from "react";
import type { JobFunctionFormState } from "../helpers/jobFunctionFormHelpers";
import type { PayrollTypeOption } from "../helpers/jobFunctionPayrollHelpers";

type JobFunctionFormPlanningFieldsProps = {
  form: JobFunctionFormState;
  payrollTypes: PayrollTypeOption[];
  saving: boolean;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
};

export default function JobFunctionFormPlanningFields({
  form,
  payrollTypes,
  saving,
  setForm,
}: JobFunctionFormPlanningFieldsProps) {
  return (
    <>
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

      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Oprettes som
        </span>
        <select
          value={form.payrollTypeId}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              payrollTypeId: event.target.value,
            }))
          }
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={saving}
        >
          <option value="">Ingen løntype valgt endnu</option>
          {payrollTypes.map((payrollType) => (
            <option key={payrollType.id} value={payrollType.id}>
              {payrollType.name}
              {payrollType.payrollCode ? ` · ${payrollType.payrollCode}` : ""}
            </option>
          ))}
        </select>
        {payrollTypes.length === 0 && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Der er ingen aktive løntyper endnu. Opret en løntype under biografens
            lønopsætning, før jobfunktionen kan bruges til oprettelse af vagter.
          </p>
        )}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Valget bruges, når forhåndsvisninger oprettes som rigtige vagter.
          Systemet opretter den tekniske vagttype automatisk.
        </p>
      </label>
    </>
  );
}
