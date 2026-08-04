import type { TimingRuleFormState } from "../../helpers/form/jobFunctionTimingRuleFormHelpers";
import { formatTimingAnchor, formatTimingOffset } from "../../helpers/page/jobFunctionHelpers";
import type { JobFunctionTimingRule } from "../../helpers/types/jobFunctionTypes";

type Props = { timingRule: JobFunctionTimingRule | null; timingRuleForm: TimingRuleFormState };

export default function JobFunctionTimingRuleSummary({ timingRule, timingRuleForm }: Props) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-100">
      <p className="font-semibold">Aktuel opsummering</p>
      <p className="mt-1">
        {timingRuleForm.restrictMovieStartsToWindow
          ? `Filmen medregnes, når den starter fra kl. ${timingRuleForm.filmWindowStartMinute} og før kl. ${timingRuleForm.filmWindowEndMinute}.`
          : "Alle filmstarter i dagens filmprogram kan medregnes."}
      </p>
      <p className="mt-1">Start: {formatTimingAnchor(timingRuleForm.startAnchor)}{timingRuleForm.startAnchor === "FIXED_TIME" ? ` · kl. ${timingRuleForm.startFixedMinute || "mangler"}` : ` · ${formatTimingOffset(Number(timingRuleForm.startOffsetMinutes || 0))}`}</p>
      <p className="mt-1">Slut: {formatTimingAnchor(timingRuleForm.endAnchor)}{timingRuleForm.endAnchor === "FIXED_TIME" ? ` · kl. ${timingRuleForm.endFixedMinute || "mangler"}` : ` · ${formatTimingOffset(Number(timingRuleForm.endOffsetMinutes || 0))}`}</p>
      <p className="mt-1">Når ingen film matcher: kl. {timingRuleForm.fallbackStartMinute} - kl. {timingRuleForm.fallbackEndMinute}</p>
      <p className="mt-1">
        Mødetid: {timingRuleForm.roundStartToNearestQuarter ? "afrundes til nærmeste kvarter" : "ingen afrunding"}.
      </p>
      <p className="mt-1">
        Fyraften: {timingRuleForm.roundEndToNearestQuarter ? "afrundes til nærmeste kvarter" : "ingen afrunding"}.
      </p>
      {timingRule?.isActive === false && <p className="mt-2 font-semibold text-amber-800 dark:text-amber-100">Reglen er arkiveret. Gem formularen for at aktivere den igen.</p>}
    </div>
  );
}
