import type { Dispatch, SetStateAction } from "react";

import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingAnchor } from "../../helpers/types/jobFunctionTypes";

import JobFunctionTimingRuleAnchorSelectField from "./JobFunctionTimingRuleAnchorSelectField";
import JobFunctionTimingRuleAnchorValueField from "./JobFunctionTimingRuleAnchorValueField";

export type TimingAnchorOption = {
  value: JobFunctionTimingAnchor;
  label: string;
};

type JobFunctionTimingRuleAnchorSectionProps = {
  anchorField: "startAnchor" | "endAnchor";
  fixedMinuteField: "startFixedMinute" | "endFixedMinute";
  offsetField: "startOffsetMinutes" | "endOffsetMinutes";
  title: string;
  anchorLabel: string;
  fixedTimeLabel: string;
  offsetHelpText: string;
  options: TimingAnchorOption[];
  timingRuleForm: TimingRuleFormState;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
};

export default function JobFunctionTimingRuleAnchorSection({
  anchorField,
  fixedMinuteField,
  offsetField,
  title,
  anchorLabel,
  fixedTimeLabel,
  offsetHelpText,
  options,
  timingRuleForm,
  timingRuleSaving,
  setTimingRuleForm,
}: JobFunctionTimingRuleAnchorSectionProps) {
  const selectedAnchor = timingRuleForm[anchorField];

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="mt-4 space-y-4">
        <JobFunctionTimingRuleAnchorSelectField
          anchorField={anchorField}
          anchorLabel={anchorLabel}
          options={options}
          selectedAnchor={selectedAnchor}
          timingRuleSaving={timingRuleSaving}
          setTimingRuleForm={setTimingRuleForm}
        />
        <JobFunctionTimingRuleAnchorValueField
          fixedMinuteField={fixedMinuteField}
          fixedTimeLabel={fixedTimeLabel}
          offsetField={offsetField}
          offsetHelpText={offsetHelpText}
          selectedAnchor={selectedAnchor}
          timingRuleForm={timingRuleForm}
          timingRuleSaving={timingRuleSaving}
          setTimingRuleForm={setTimingRuleForm}
        />
      </div>
    </div>
  );
}
