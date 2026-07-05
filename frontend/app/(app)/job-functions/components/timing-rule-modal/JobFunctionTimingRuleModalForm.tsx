import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  timingEndAnchorOptions,
  timingStartAnchorOptions,
} from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type {
  DayPeriod,
  JobFunctionTimingRule,
} from "../../helpers/types/jobFunctionTypes";
import JobFunctionTimingRuleActions from "./JobFunctionTimingRuleActions";
import JobFunctionTimingRuleAnchorSection from "./JobFunctionTimingRuleAnchorSection";
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
  );
}
