import {
  parseTimingRuleForm,
  type TimingRuleFormState,
} from "../form/jobFunctionTimingRuleFormHelpers";
import type { JobFunctionTimingRule } from "../types/jobFunctionTypes";

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
