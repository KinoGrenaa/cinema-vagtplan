import { formatMinute, timeToMinute } from "../page/jobFunctionHelpers";
import type {
  JobFunction,
  JobFunctionTimingAnchor,
  JobFunctionTimingRule,
} from "../types/jobFunctionTypes";

export type TimingRuleFormState = {
  filmWindowStartMinute: string;
  filmWindowEndMinute: string;
  startAnchor: JobFunctionTimingAnchor;
  startOffsetMinutes: string;
  startFixedMinute: string;
  endAnchor: JobFunctionTimingAnchor;
  endOffsetMinutes: string;
  endFixedMinute: string;
  fallbackStartMinute: string;
  fallbackEndMinute: string;
  roundStartToNearestQuarter: boolean;
  roundEndToNearestQuarter: boolean;
  restrictMovieStartsToWindow: boolean;
};

export const timingStartAnchorOptions: Array<{
  value: JobFunctionTimingAnchor;
  label: string;
}> = [
  { value: "FIRST_MOVIE_START", label: "Første filmstart" },
  { value: "FIRST_MOVIE_END", label: "Første filmslut" },
  { value: "LAST_MOVIE_START", label: "Sidste filmstart" },
  { value: "LAST_MOVIE_END", label: "Sidste filmslut" },
  { value: "FIXED_TIME", label: "Fast tidspunkt" },
];

export const timingEndAnchorOptions = timingStartAnchorOptions;

export const emptyTimingRuleForm: TimingRuleFormState = {
  filmWindowStartMinute: "00:00",
  filmWindowEndMinute: "00:00",
  startAnchor: "FIRST_MOVIE_START",
  startOffsetMinutes: "0",
  startFixedMinute: "",
  endAnchor: "LAST_MOVIE_END",
  endOffsetMinutes: "0",
  endFixedMinute: "",
  fallbackStartMinute: "16:00",
  fallbackEndMinute: "23:00",
  roundStartToNearestQuarter: false,
  roundEndToNearestQuarter: false,
  restrictMovieStartsToWindow: true,
};

function minuteToFormTime(value: number) {
  return formatMinute(((value % 1440) + 1440) % 1440).replace("kl. ", "");
}

export function toTimingRuleForm(
  rule: JobFunctionTimingRule | null | undefined,
  _jobFunction?: Pick<JobFunction, "id"> | null,
): TimingRuleFormState {
  if (!rule) return { ...emptyTimingRuleForm };

  return {
    filmWindowStartMinute: minuteToFormTime(rule.filmWindowStartMinute),
    filmWindowEndMinute: minuteToFormTime(rule.filmWindowEndMinute),
    startAnchor: rule.startAnchor,
    startOffsetMinutes: String(rule.startOffsetMinutes ?? 0),
    startFixedMinute:
      rule.startFixedMinute !== null ? minuteToFormTime(rule.startFixedMinute) : "",
    endAnchor: rule.endAnchor,
    endOffsetMinutes: String(rule.endOffsetMinutes ?? 0),
    endFixedMinute:
      rule.endFixedMinute !== null ? minuteToFormTime(rule.endFixedMinute) : "",
    fallbackStartMinute: minuteToFormTime(rule.fallbackStartMinute),
    fallbackEndMinute: minuteToFormTime(rule.fallbackEndMinute),
    roundStartToNearestQuarter:
      rule.roundStartToNearestQuarter ?? rule.roundToQuarter ?? false,
    roundEndToNearestQuarter:
      rule.roundEndToNearestQuarter ?? rule.roundToQuarter ?? false,
    restrictMovieStartsToWindow: rule.restrictMovieStartsToWindow,
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

function normalizeEndAfterStart(start: number, end: number) {
  return end <= start ? end + 1440 : end;
}

export function parseTimingRuleForm(form: TimingRuleFormState) {
  const filmWindowStartMinute = timeToMinute(
    form.filmWindowStartMinute,
    "Starten på tidsrummet for filmvisninger",
  );
  const filmWindowEndMinute = normalizeEndAfterStart(
    filmWindowStartMinute,
    timeToMinute(form.filmWindowEndMinute, "Slutningen på tidsrummet for filmvisninger"),
  );
  const startFixedMinute =
    form.startAnchor === "FIXED_TIME"
      ? timeToMinute(form.startFixedMinute, "Fast starttidspunkt")
      : null;
  const rawEndFixedMinute =
    form.endAnchor === "FIXED_TIME"
      ? timeToMinute(form.endFixedMinute, "Fast sluttidspunkt")
      : null;
  const endFixedMinute =
    startFixedMinute !== null && rawEndFixedMinute !== null
      ? normalizeEndAfterStart(startFixedMinute, rawEndFixedMinute)
      : rawEndFixedMinute;
  const fallbackStartMinute = timeToMinute(
    form.fallbackStartMinute,
    "Start uden filmprogram",
  );
  const fallbackEndMinute = normalizeEndAfterStart(
    fallbackStartMinute,
    timeToMinute(form.fallbackEndMinute, "Slut uden filmprogram"),
  );

  return {
    filmWindowStartMinute,
    filmWindowEndMinute,
    startAnchor: form.startAnchor,
    startOffsetMinutes: parseOffsetInput(form.startOffsetMinutes, "Start-forskydning"),
    startFixedMinute,
    endAnchor: form.endAnchor,
    endOffsetMinutes: parseOffsetInput(form.endOffsetMinutes, "Slut-forskydning"),
    endFixedMinute,
    fallbackStartMinute,
    fallbackEndMinute,
    roundStartToNearestQuarter: form.roundStartToNearestQuarter,
    roundEndToNearestQuarter: form.roundEndToNearestQuarter,
    restrictMovieStartsToWindow: form.restrictMovieStartsToWindow,
  };
}
