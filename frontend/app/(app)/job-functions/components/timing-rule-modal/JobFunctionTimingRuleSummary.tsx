import type { TimingRuleFormState } from "../../helpers/jobFunctionTimingRuleFormHelpers";
import {
  formatTimingAnchor,
  formatTimingOffset,
} from "../../helpers/jobFunctionHelpers";
import type { JobFunctionTimingRule } from "../../helpers/jobFunctionTypes";

type JobFunctionTimingRuleSummaryProps = {
  timingRule: JobFunctionTimingRule | null;
  timingRuleForm: TimingRuleFormState;
};

export default function JobFunctionTimingRuleSummary({
  timingRule,
  timingRuleForm,
}: JobFunctionTimingRuleSummaryProps) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-100">
      <p className="font-semibold">Aktuel opsummering</p>
      <p className="mt-1">
        Start: {formatTimingAnchor(timingRuleForm.startAnchor)}
        {timingRuleForm.startAnchor === "FIXED_TIME"
          ? timingRuleForm.startFixedMinute
            ? ` · kl. ${timingRuleForm.startFixedMinute}`
            : " · mangler tidspunkt"
          : ` · ${formatTimingOffset(Number(timingRuleForm.startOffsetMinutes || 0))}`}
      </p>
      <p className="mt-1">
        Slut: {formatTimingAnchor(timingRuleForm.endAnchor)}
        {timingRuleForm.endAnchor === "FIXED_TIME"
          ? timingRuleForm.endFixedMinute
            ? ` · kl. ${timingRuleForm.endFixedMinute}`
            : " · mangler tidspunkt"
          : ` · ${formatTimingOffset(Number(timingRuleForm.endOffsetMinutes || 0))}`}
      </p>
      {timingRule?.isActive === false && (
        <p className="mt-2 font-semibold text-amber-800 dark:text-amber-100">
          Reglen er arkiveret. Gem formularen for at aktivere den igen.
        </p>
      )}
    </div>
  );
}
