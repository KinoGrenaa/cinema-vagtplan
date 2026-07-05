import type { Dispatch, FormEvent, SetStateAction } from "react";
import JobFunctionFormActions from "./JobFunctionFormActions";
import JobFunctionFormDetailsFields from "./JobFunctionFormDetailsFields";
import JobFunctionFormModalHeader from "./JobFunctionFormModalHeader";
import JobFunctionFormPlanningFields from "./JobFunctionFormPlanningFields";
import type { JobFunctionFormState } from "../helpers/jobFunctionFormHelpers";
import type { PayrollTypeOption } from "../helpers/jobFunctionPayrollHelpers";

type JobFunctionFormModalProps = {
  form: JobFunctionFormState;
  isEditing: boolean;
  payrollTypes: PayrollTypeOption[];
  saving: boolean;
  setForm: Dispatch<SetStateAction<JobFunctionFormState>>;
  onClose: () => void;
  onSubmit: () => void;
};

export default function JobFunctionFormModal({
  form,
  isEditing,
  payrollTypes,
  saving,
  setForm,
  onClose,
  onSubmit,
}: JobFunctionFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <JobFunctionFormModalHeader
          isEditing={isEditing}
          saving={saving}
          onClose={onClose}
        />

        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onSubmit();
          }}
          className="space-y-5"
        >
          <JobFunctionFormDetailsFields
            form={form}
            saving={saving}
            setForm={setForm}
          />

          <JobFunctionFormPlanningFields
            form={form}
            payrollTypes={payrollTypes}
            saving={saving}
            setForm={setForm}
          />

          <JobFunctionFormActions
            isEditing={isEditing}
            saving={saving}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
}
