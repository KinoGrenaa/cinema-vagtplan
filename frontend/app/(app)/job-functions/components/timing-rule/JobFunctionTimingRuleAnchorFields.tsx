import type { Dispatch, SetStateAction } from "react";

import {
  timingEndAnchorOptions,
  timingStartAnchorOptions,
} from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";

import JobFunctionTimingRuleAnchorSection from "./JobFunctionTimingRuleAnchorSection";

type JobFunctionTimingRuleAnchorFieldsProps = {
  timingRuleForm: TimingRuleFormState;
  timingRuleSaving: boolean;
  setTimingRuleForm: Dispatch<SetStateAction<TimingRuleFormState>>;
};

export default function JobFunctionTimingRuleAnchorFields({
  timingRuleForm,
  timingRuleSaving,
  setTimingRuleForm,
}: JobFunctionTimingRuleAnchorFieldsProps) {
  return (
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
  );
}
