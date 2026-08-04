import type { Dispatch, SetStateAction } from "react";

import type { JobFunctionFormState } from "../../helpers/form/jobFunctionFormHelpers";
import type { PayrollTypeOption } from "../../helpers/payroll/jobFunctionPayrollHelpers";

type Props = {
  form: JobFunctionFormState;
  payrollTypes: PayrollTypeOption[];
  saving: boolean;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
};

export default function JobFunctionPayrollTypeField({
  form,
  payrollTypes,
  saving,
  setForm,
}: Props) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Standardeksportkode
      </span>
      <select
        value={form.payrollTypeId}
        onChange={(event) =>
          setForm((current) => ({ ...current, payrollTypeId: event.target.value }))
        }
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        disabled={saving}
      >
        <option value="">Ingen eksportkode</option>
        {payrollTypes.map((payrollType) => (
          <option key={payrollType.id} value={payrollType.id}>
            {payrollType.name}
            {payrollType.payrollCode ? ` · ${payrollType.payrollCode}` : ""}
          </option>
        ))}
      </select>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Eksportkoden bruges til gruppering og ekstern løneksport. Den bestemmer
        ikke medarbejderens grundløn.
      </p>
    </label>
  );
}
