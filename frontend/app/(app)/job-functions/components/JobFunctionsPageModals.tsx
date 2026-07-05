import type { ComponentProps } from "react";

import JobFunctionEmployeeModal from "./JobFunctionEmployeeModal";
import JobFunctionFormModal from "./JobFunctionFormModal";
import JobFunctionTimingRuleModal from "./JobFunctionTimingRuleModal";

type JobFunctionsPageModalsProps = {
  formModalOpen: boolean;
  formModalProps: ComponentProps<typeof JobFunctionFormModal>;
  timingRuleModalProps: ComponentProps<typeof JobFunctionTimingRuleModal> | null;
  employeeModalProps: ComponentProps<typeof JobFunctionEmployeeModal> | null;
};

export default function JobFunctionsPageModals({
  formModalOpen,
  formModalProps,
  timingRuleModalProps,
  employeeModalProps,
}: JobFunctionsPageModalsProps) {
  return (
    <>
      {formModalOpen && <JobFunctionFormModal {...formModalProps} />}

      {timingRuleModalProps && (
        <JobFunctionTimingRuleModal {...timingRuleModalProps} />
      )}

      {employeeModalProps && <JobFunctionEmployeeModal {...employeeModalProps} />}
    </>
  );
}
