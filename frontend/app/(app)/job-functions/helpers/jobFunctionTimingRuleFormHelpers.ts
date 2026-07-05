import {
  formatMinute,
  optionalTimeToMinute,
  timeToMinute,
} from "./jobFunctionHelpers";
import type {
  JobFunction,
  JobFunctionTimingAnchor,
  JobFunctionTimingRule,
} from "./jobFunctionTypes";

export type TimingRuleFormState = {
  dayPeriodId: string;
  startAnchor: JobFunctionTimingAnchor;
  startOffsetMinutes: string;
  startFixedMinute: string;
  endAnchor: JobFunctionTimingAnchor;
  endOffsetMinutes: string;
  endFixedMinute: string;
  fallbackStartMinute: string;
  fallbackEndMinute: string;
  clampToDayPeriod: boolean;
};

export const timingStartAnchorOptions: Array<{
  value: JobFunctionTimingAnchor;
  label: string;
}> = [
  { value: "FIRST_MOVIE_START", label: "Første filmstart" },
  { value: "FIRST_MOVIE_END", label: "Første filmslut" },
  { value: "FIXED_TIME", label: "Fast tidspunkt" },
];

export const timingEndAnchorOptions: Array<{
  value: JobFunctionTimingAnchor;
  label: string;
}> = [
  { value: "LAST_MOVIE_START", label: "Sidste filmstart" },
  { value: "LAST_MOVIE_END", label: "Sidste filmslut" },
  { value: "FIXED_TIME", label: "Fast tidspunkt" },
];

export const emptyTimingRuleForm: TimingRuleFormState = {
  dayPeriodId: "",
  startAnchor: "FIRST_MOVIE_START",
  startOffsetMinutes: "0",
  startFixedMinute: "",
  endAnchor: "LAST_MOVIE_END",
  endOffsetMinutes: "0",
  endFixedMinute: "",
  fallbackStartMinute: "",
  fallbackEndMinute: "",
  clampToDayPeriod: false,
};

function normalizeStartAnchor(
  anchor: JobFunctionTimingAnchor,
): JobFunctionTimingAnchor {
  return anchor === "FIXED_TIME" ? "FIXED_TIME" : "FIRST_MOVIE_START";
}

function normalizeEndAnchor(anchor: JobFunctionTimingAnchor): JobFunctionTimingAnchor {
  return anchor === "FIXED_TIME" ? "FIXED_TIME" : "LAST_MOVIE_END";
}

function getTimingRuleDayPeriodId(
  jobFunction?: Pick<JobFunction, "dayPeriodId"> | null,
  rule?: JobFunctionTimingRule | null,
) {
  const directDayPeriodId = jobFunction?.dayPeriodId;
  if (typeof directDayPeriodId === "number" && directDayPeriodId > 0) {
    return String(directDayPeriodId);
  }

  const ruleDayPeriodId = rule?.jobFunction?.dayPeriod?.id;
  if (typeof ruleDayPeriodId === "number" && ruleDayPeriodId > 0) {
    return String(ruleDayPeriodId);
  }

  return "";
}

export function toTimingRuleForm(
  rule: JobFunctionTimingRule | null | undefined,
  jobFunction?: Pick<JobFunction, "dayPeriodId"> | null,
): TimingRuleFormState {
  if (!rule) {
    return {
      ...emptyTimingRuleForm,
      dayPeriodId: getTimingRuleDayPeriodId(jobFunction, null),
    };
  }

  return {
    dayPeriodId: getTimingRuleDayPeriodId(jobFunction, rule),
    startAnchor: normalizeStartAnchor(rule.startAnchor),
    startOffsetMinutes: String(rule.startOffsetMinutes ?? 0),
    startFixedMinute:
      rule.startFixedMinute !== null
        ? formatMinute(rule.startFixedMinute).replace("kl. ", "")
        : "",
    endAnchor: normalizeEndAnchor(rule.endAnchor),
    endOffsetMinutes: String(rule.endOffsetMinutes ?? 0),
    endFixedMinute:
      rule.endFixedMinute !== null
        ? formatMinute(rule.endFixedMinute).replace("kl. ", "")
        : "",
    fallbackStartMinute:
      rule.fallbackStartMinute !== null
        ? formatMinute(rule.fallbackStartMinute).replace("kl. ", "")
        : "",
    fallbackEndMinute:
      rule.fallbackEndMinute !== null
        ? formatMinute(rule.fallbackEndMinute).replace("kl. ", "")
        : "",
    clampToDayPeriod: rule.clampToDayPeriod,
  };
}

function parseOffsetInput(value: string, fieldName: string) {
  const normalized = value.trim();
  const parsedValue = normalized ? Number(normalized) : 0;

  if (!Number.isInteger(parsedValue)) {
    throw new Error(`${fieldName} skal være et helt antal minutter.`);
  }

  if (parsedValue < -720 || parsedValue > 720) {
    throw new Error(`${fieldName} skal være mellem -720 og 720 minutter.`);
  }

  return parsedValue;
}

export function parseTimingRuleDayPeriodId(value: string) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error("Dagsperiode skal være et gyldigt valg.");
  }

  return parsedValue;
}

export function parseTimingRuleForm(form: TimingRuleFormState) {
  const startFixedMinute =
    form.startAnchor === "FIXED_TIME"
      ? timeToMinute(form.startFixedMinute, "Fast starttidspunkt")
      : null;
  const endFixedMinute =
    form.endAnchor === "FIXED_TIME"
      ? timeToMinute(form.endFixedMinute, "Fast sluttidspunkt")
      : null;
  const fallbackStartMinute = optionalTimeToMinute(
    form.fallbackStartMinute,
    "Tidspunkt hvor vagten starter uden filmprogram",
  );
  const fallbackEndMinute = optionalTimeToMinute(
    form.fallbackEndMinute,
    "Tidspunkt hvor vagten slutter uden filmprogram",
  );
  const hasFallbackStart = fallbackStartMinute !== null;
  const hasFallbackEnd = fallbackEndMinute !== null;

  if (hasFallbackStart !== hasFallbackEnd) {
    throw new Error("Udfyld både start og slut, når der angives tider uden filmprogram.");
  }

  if (
    fallbackStartMinute !== null &&
    fallbackEndMinute !== null &&
    fallbackEndMinute <= fallbackStartMinute
  ) {
    throw new Error(
      "Starttidspunkt uden filmprogram skal være før sluttidspunkt uden filmprogram.",
    );
  }

  return {
    startAnchor: form.startAnchor,
    startOffsetMinutes: parseOffsetInput(
      form.startOffsetMinutes,
      "Start-forskydning",
    ),
    startFixedMinute,
    endAnchor: form.endAnchor,
    endOffsetMinutes: parseOffsetInput(
      form.endOffsetMinutes,
      "Slut-forskydning",
    ),
    endFixedMinute,
    fallbackStartMinute,
    fallbackEndMinute,
    clampToDayPeriod: form.clampToDayPeriod,
  };
}
