import type { Dispatch, SetStateAction } from "react";

import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";

import JobFunctionTimingRuleFallbackTimeField from "./JobFunctionTimingRuleFallbackTimeField";

type JobFunctionTimingRuleFallbackFieldsProps = {
  timingRuleForm: TimingRuleFormState;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
};

export default function JobFunctionTimingRuleFallbackFields({
  timingRuleForm,
  timingRuleSaving,
  setTimingRuleForm,
}: JobFunctionTimingRuleFallbackFieldsProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Når ingen film matcher reglen
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <JobFunctionTimingRuleFallbackTimeField
          label="Brug denne mødetid"
          value={timingRuleForm.fallbackStartMinute}
          disabled={timingRuleSaving}
          onChange={(value) =>
            setTimingRuleForm((current) => ({
              ...current,
              fallbackStartMinute: value,
            }))
          }
        />
        <JobFunctionTimingRuleFallbackTimeField
          label="Brug denne fyraften"
          value={timingRuleForm.fallbackEndMinute}
          disabled={timingRuleSaving}
          onChange={(value) =>
            setTimingRuleForm((current) => ({
              ...current,
              fallbackEndMinute: value,
            }))
          }
        />
      </div>
    </div>
  );
}
