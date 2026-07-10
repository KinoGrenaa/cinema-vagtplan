import type { Dispatch, SetStateAction } from "react";

import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionWithWorkType } from "../../helpers/payroll/jobFunctionPayrollHelpers";
import type {
  DayPeriod,
  JobFunctionTimingRule,
} from "../../helpers/types/jobFunctionTypes";
import JobFunctionTimingRuleModalForm from "./JobFunctionTimingRuleModalForm";
import JobFunctionTimingRuleModalHeader from "./JobFunctionTimingRuleModalHeader";
import JobFunctionTimingRuleModalLoadingState from "./JobFunctionTimingRuleModalLoadingState";

type JobFunctionTimingRuleModalProps = {
  dayPeriods: DayPeriod[];
  jobFunction: JobFunctionWithWorkType;
  timingRule: JobFunctionTimingRule | null;
  timingRuleForm: TimingRuleFormState;
  timingRuleLoading: boolean;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
  onArchive: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function JobFunctionTimingRuleModal({
  dayPeriods,
  jobFunction,
  timingRule,
  timingRuleForm,
  timingRuleLoading,
  timingRuleSaving,
  setTimingRuleForm,
  onArchive,
  onClose,
  onSubmit,
}: JobFunctionTimingRuleModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <JobFunctionTimingRuleModalHeader jobFunction={jobFunction} />

        {timingRuleLoading ? (
          <JobFunctionTimingRuleModalLoadingState />
        ) : (
          <JobFunctionTimingRuleModalForm
            dayPeriods={dayPeriods}
            timingRule={timingRule}
            timingRuleForm={timingRuleForm}
            timingRuleSaving={timingRuleSaving}
            setTimingRuleForm={setTimingRuleForm}
            onArchive={onArchive}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
}
