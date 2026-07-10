import type { Dispatch, SetStateAction } from "react";

import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingAnchor } from "../../helpers/types/jobFunctionTypes";

type JobFunctionTimingRuleAnchorValueFieldProps = {
  fixedMinuteField: "startFixedMinute" | "endFixedMinute";
  fixedTimeLabel: string;
  offsetField: "startOffsetMinutes" | "endOffsetMinutes";
  offsetHelpText: string;
  selectedAnchor: JobFunctionTimingAnchor;
  timingRuleForm: TimingRuleFormState;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
};

export default function JobFunctionTimingRuleAnchorValueField({
  fixedMinuteField,
  fixedTimeLabel,
  offsetField,
  offsetHelpText,
  selectedAnchor,
  timingRuleForm,
  timingRuleSaving,
  setTimingRuleForm,
}: JobFunctionTimingRuleAnchorValueFieldProps) {
  if (selectedAnchor === "FIXED_TIME") {
    return (
      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {fixedTimeLabel}
        </span>
        <input
          type="time"
          value={timingRuleForm[fixedMinuteField]}
          onChange={(event) =>
            setTimingRuleForm((current) => ({
              ...current,
              [fixedMinuteField]: event.target.value,
            }))
          }
          className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={timingRuleSaving}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Forskydning i minutter
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={timingRuleForm[offsetField]}
        onChange={(event) =>
          setTimingRuleForm((current) => ({
            ...current,
            [offsetField]: event.target.value,
          }))
        }
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        disabled={timingRuleSaving}
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {offsetHelpText}
      </p>
    </label>
  );
}
