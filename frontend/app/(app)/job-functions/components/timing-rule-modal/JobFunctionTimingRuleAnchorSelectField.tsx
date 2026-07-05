import type { Dispatch, SetStateAction } from "react";

import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingAnchor } from "../../helpers/types/jobFunctionTypes";

import type { TimingAnchorOption } from "./JobFunctionTimingRuleAnchorSection";

type JobFunctionTimingRuleAnchorSelectFieldProps = {
  anchorField: "startAnchor" | "endAnchor";
  anchorLabel: string;
  options: TimingAnchorOption[];
  selectedAnchor: JobFunctionTimingAnchor;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
};

export default function JobFunctionTimingRuleAnchorSelectField({
  anchorField,
  anchorLabel,
  options,
  selectedAnchor,
  timingRuleSaving,
  setTimingRuleForm,
}: JobFunctionTimingRuleAnchorSelectFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {anchorLabel}
      </span>
      <select
        value={selectedAnchor}
        onChange={(event) =>
          setTimingRuleForm((current) => ({
            ...current,
            [anchorField]: event.target.value as JobFunctionTimingAnchor,
          }))
        }
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        disabled={timingRuleSaving}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
