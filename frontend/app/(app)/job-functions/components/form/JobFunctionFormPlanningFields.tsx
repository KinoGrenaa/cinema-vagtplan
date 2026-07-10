import type { Dispatch, SetStateAction } from "react";

import type { JobFunctionFormState } from "../../helpers/form/jobFunctionFormHelpers";
import type { PayrollTypeOption } from "../../helpers/payroll/jobFunctionPayrollHelpers";

import JobFunctionPayrollTypeField from "./JobFunctionPayrollTypeField";
import JobFunctionSortColorFields from "./JobFunctionSortColorFields";

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
      <JobFunctionSortColorFields
        form={form}
        saving={saving}
        setForm={setForm}
      />
      <JobFunctionPayrollTypeField
        form={form}
        payrollTypes={payrollTypes}
        saving={saving}
        setForm={setForm}
      />
    </>
  );
}
