import type { Dispatch, SetStateAction } from "react";
import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import { formatDayPeriod } from "../../helpers/page/jobFunctionHelpers";
import type { DayPeriod } from "../../helpers/types/jobFunctionTypes";

type JobFunctionTimingRuleDayPeriodFieldProps = {
  dayPeriods: DayPeriod[];
  timingRuleForm: TimingRuleFormState;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
};

export default function JobFunctionTimingRuleDayPeriodField({
  dayPeriods,
  timingRuleForm,
  timingRuleSaving,
  setTimingRuleForm,
}: JobFunctionTimingRuleDayPeriodFieldProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
      <label className="block">
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Dagsperiode for reglen
        </span>
        <select
          value={timingRuleForm.dayPeriodId}
          onChange={(event) =>
            setTimingRuleForm((current) => ({
              ...current,
              dayPeriodId: event.target.value,
            }))
          }
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          disabled={timingRuleSaving}
        >
          <option value="">Ingen dagsperiode</option>
          {dayPeriods.map((dayPeriod) => (
            <option key={dayPeriod.id} value={dayPeriod.id}>
              {formatDayPeriod(dayPeriod)}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Dagsperioden afgrænser, hvilke forestillinger start- og slutreglen
          kigger på. Hvis der ikke ligger film i perioden, bruges tiderne uden
          filmprogram.
        </p>
      </label>
    </div>
  );
}
