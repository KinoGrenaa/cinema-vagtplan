import type { Dispatch, SetStateAction } from "react";
import type { TimingRuleFormState } from "../helpers/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingAnchor } from "../helpers/jobFunctionTypes";

type TimingAnchorOption = {
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

        {selectedAnchor === "FIXED_TIME" ? (
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
        ) : (
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
        )}
      </div>
    </div>
  );
}
