import type { Dispatch, SetStateAction } from "react";
import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";

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
        Dage uden filmprogram
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Hvis der ikke er noget filmprogram i den valgte dagsperiode, starter
            vagten
          </span>
          <input
            type="time"
            value={timingRuleForm.fallbackStartMinute}
            onChange={(event) =>
              setTimingRuleForm((current) => ({
                ...current,
                fallbackStartMinute: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            disabled={timingRuleSaving}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Hvis der ikke er noget filmprogram i den valgte dagsperiode, slutter
            vagten
          </span>
          <input
            type="time"
            value={timingRuleForm.fallbackEndMinute}
            onChange={(event) =>
              setTimingRuleForm((current) => ({
                ...current,
                fallbackEndMinute: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            disabled={timingRuleSaving}
          />
        </label>
      </div>
    </div>
  );
}
