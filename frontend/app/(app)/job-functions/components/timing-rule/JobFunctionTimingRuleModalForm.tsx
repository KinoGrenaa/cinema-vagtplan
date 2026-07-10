import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type {
  DayPeriod,
  JobFunctionTimingRule,
} from "../../helpers/types/jobFunctionTypes";

import JobFunctionTimingRuleActions from "./JobFunctionTimingRuleActions";
import JobFunctionTimingRuleAnchorFields from "./JobFunctionTimingRuleAnchorFields";
import JobFunctionTimingRuleDayPeriodField from "./JobFunctionTimingRuleDayPeriodField";
import JobFunctionTimingRuleFallbackFields from "./JobFunctionTimingRuleFallbackFields";
import JobFunctionTimingRuleSummary from "./JobFunctionTimingRuleSummary";

type JobFunctionTimingRuleModalFormProps = {
  dayPeriods: DayPeriod[];
  timingRule: JobFunctionTimingRule | null;
  timingRuleForm: TimingRuleFormState;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
  onArchive: () => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function JobFunctionTimingRuleModalForm({
  dayPeriods,
  timingRule,
  timingRuleForm,
  timingRuleSaving,
  setTimingRuleForm,
  onArchive,
  onClose,
  onSubmit,
}: JobFunctionTimingRuleModalFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <JobFunctionTimingRuleDayPeriodField
        dayPeriods={dayPeriods}
        timingRuleForm={timingRuleForm}
        timingRuleSaving={timingRuleSaving}
        setTimingRuleForm={setTimingRuleForm}
      />

      <JobFunctionTimingRuleAnchorFields
        timingRuleForm={timingRuleForm}
        timingRuleSaving={timingRuleSaving}
        setTimingRuleForm={setTimingRuleForm}
      />

      <JobFunctionTimingRuleFallbackFields
        timingRuleForm={timingRuleForm}
        timingRuleSaving={timingRuleSaving}
        setTimingRuleForm={setTimingRuleForm}
      />

      <JobFunctionTimingRuleSummary
        timingRule={timingRule}
        timingRuleForm={timingRuleForm}
      />

      <JobFunctionTimingRuleActions
        hasActiveTimingRule={Boolean(timingRule?.isActive)}
        timingRuleSaving={timingRuleSaving}
        onArchive={onArchive}
        onClose={onClose}
      />
    </form>
  );
}
