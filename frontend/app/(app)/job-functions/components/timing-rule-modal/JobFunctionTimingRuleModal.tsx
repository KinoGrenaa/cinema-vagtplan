import type { Dispatch, FormEvent, SetStateAction } from "react";
import JobFunctionTimingRuleActions from "./JobFunctionTimingRuleActions";
import JobFunctionTimingRuleAnchorSection from "./JobFunctionTimingRuleAnchorSection";
import JobFunctionTimingRuleDayPeriodField from "./JobFunctionTimingRuleDayPeriodField";
import JobFunctionTimingRuleFallbackFields from "./JobFunctionTimingRuleFallbackFields";
import JobFunctionTimingRuleSummary from "./JobFunctionTimingRuleSummary";
import {
  timingEndAnchorOptions,
  timingStartAnchorOptions,
} from "../../helpers/jobFunctionTimingRuleFormHelpers";
import type { TimingRuleFormState } from "../../helpers/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionWithWorkType } from "../../helpers/jobFunctionPayrollHelpers";
import type {
  DayPeriod,
  JobFunctionTimingRule,
} from "../../helpers/jobFunctionTypes";

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
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
            Møde- og fyraftensregel
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
            {jobFunction.name}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Reglen bruges til at beregne mødetid og fyraften ud fra dagsperiode,
            filmprogram og tider uden filmprogram, når vagtplanlægning opretter
            vagter fra en forhåndsvisning.
          </p>
        </div>

        {timingRuleLoading && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Henter møde- og fyraftensregel...
          </div>
        )}

        {!timingRuleLoading && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <JobFunctionTimingRuleDayPeriodField
              dayPeriods={dayPeriods}
              timingRuleForm={timingRuleForm}
              timingRuleSaving={timingRuleSaving}
              setTimingRuleForm={setTimingRuleForm}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <JobFunctionTimingRuleAnchorSection
                anchorField="startAnchor"
                fixedMinuteField="startFixedMinute"
                offsetField="startOffsetMinutes"
                title="Start / mødetid"
                anchorLabel="Startregel"
                fixedTimeLabel="Fast starttidspunkt"
                offsetHelpText="Negativt tal betyder før ankeret. Eksempel: -60 = 60 min før."
                options={timingStartAnchorOptions}
                timingRuleForm={timingRuleForm}
                timingRuleSaving={timingRuleSaving}
                setTimingRuleForm={setTimingRuleForm}
              />

              <JobFunctionTimingRuleAnchorSection
                anchorField="endAnchor"
                fixedMinuteField="endFixedMinute"
                offsetField="endOffsetMinutes"
                title="Slut / fyraften"
                anchorLabel="Slutregel"
                fixedTimeLabel="Fast sluttidspunkt"
                offsetHelpText="Positivt tal betyder efter ankeret. Eksempel: 15 = 15 min efter."
                options={timingEndAnchorOptions}
                timingRuleForm={timingRuleForm}
                timingRuleSaving={timingRuleSaving}
                setTimingRuleForm={setTimingRuleForm}
              />
            </div>

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
        )}
      </div>
    </div>
  );
}
