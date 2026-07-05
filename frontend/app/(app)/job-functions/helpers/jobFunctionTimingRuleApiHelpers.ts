import {
  parseTimingRuleDayPeriodId,
  parseTimingRuleForm,
  type TimingRuleFormState,
} from "./jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingRule } from "./jobFunctionTypes";

export function parseTimingRuleResponseText(
  rawText: string,
): JobFunctionTimingRule | null {
  return rawText.trim()
    ? (JSON.parse(rawText) as JobFunctionTimingRule)
    : null;
}

export function buildTimingRulePayload(
  timingRuleForm: TimingRuleFormState,
  activeCinemaId: number | null,
) {
  return {
    ...parseTimingRuleForm(timingRuleForm),
    cinemaId: activeCinemaId,
  };
}

export function buildJobFunctionDayPeriodPayload(
  timingRuleForm: TimingRuleFormState,
  activeCinemaId: number | null,
) {
  return {
    dayPeriodId: parseTimingRuleDayPeriodId(timingRuleForm.dayPeriodId),
    cinemaId: activeCinemaId,
  };
}
