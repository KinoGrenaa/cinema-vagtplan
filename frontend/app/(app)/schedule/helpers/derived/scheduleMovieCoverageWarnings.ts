import type { JobFunction, Shift } from "../../../../../../shared/types";

export type MovieCoverageShowing = {
  id: number;
  title: string;
  hall: string;
  startTime: string;
  endTime: string;
};

export type ScheduleMovieCoverageWarning = {
  key: string;
  title: string;
  description: string;
  hasAssignedStaff: boolean;
};

const MINUTES_PER_DAY = 24 * 60;
const MOVIE_ANCHORS = new Set([
  "FIRST_MOVIE_START",
  "FIRST_MOVIE_END",
  "LAST_MOVIE_START",
  "LAST_MOVIE_END",
]);

function getCopenhagenParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

function getDateKey(value: Date) {
  const parts = getCopenhagenParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getMinuteRelativeToSelectedDate(value: Date, selectedDate: string) {
  const parts = getCopenhagenParts(value);
  const [year, month, day] = selectedDate.split("-").map(Number);
  const selectedDay = Date.UTC(year, month - 1, day);
  const valueDay = Date.UTC(parts.year, parts.month - 1, parts.day);
  const dayOffset = Math.round((valueDay - selectedDay) / 86_400_000);

  return dayOffset * MINUTES_PER_DAY + parts.hour * 60 + parts.minute;
}

function normalizeWindowEnd(startMinute: number, endMinute: number) {
  return endMinute <= startMinute ? endMinute + MINUTES_PER_DAY : endMinute;
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("da-DK", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timingRuleUsesMovies(jobFunction: JobFunction) {
  const rule = jobFunction.timingRule;

  return Boolean(
    rule &&
      rule.isActive !== false &&
      (MOVIE_ANCHORS.has(rule.startAnchor) || MOVIE_ANCHORS.has(rule.endAnchor)),
  );
}

function timingRuleIncludesMovieStart(
  jobFunction: JobFunction,
  showingStartMinute: number,
) {
  const rule = jobFunction.timingRule;
  if (!rule || rule.isActive === false) return false;
  if (!timingRuleUsesMovies(jobFunction)) return false;
  if (rule.restrictMovieStartsToWindow === false) return true;

  const windowEnd = normalizeWindowEnd(
    rule.filmWindowStartMinute,
    rule.filmWindowEndMinute,
  );

  return (
    showingStartMinute >= rule.filmWindowStartMinute &&
    showingStartMinute < windowEnd
  );
}

function assignedShiftCoversTime(shift: Shift, value: Date) {
  if (!shift.userId) return false;

  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);

  return start <= value && end > value;
}

export function buildScheduleMovieCoverageWarnings({
  selectedDate,
  movieShowings,
  jobFunctions,
  shifts,
}: {
  selectedDate: string;
  movieShowings: MovieCoverageShowing[];
  jobFunctions: JobFunction[];
  shifts: Shift[];
}): ScheduleMovieCoverageWarning[] {
  const movieBasedJobFunctions = jobFunctions.filter(timingRuleUsesMovies);
  if (movieBasedJobFunctions.length === 0) return [];

  const assignedShifts = shifts.filter((shift) => Boolean(shift.userId));

  return movieShowings.flatMap<ScheduleMovieCoverageWarning>((showing) => {
    const showingStart = new Date(showing.startTime);

    if (getDateKey(showingStart) !== selectedDate) return [];

    const showingStartMinute = getMinuteRelativeToSelectedDate(
      showingStart,
      selectedDate,
    );
    const coveredByTimingRule = movieBasedJobFunctions.some((jobFunction) =>
      timingRuleIncludesMovieStart(jobFunction, showingStartMinute),
    );

    if (coveredByTimingRule) return [];

    const coveringShift = assignedShifts.find((shift) =>
      assignedShiftCoversTime(shift, showingStart),
    );
    const nextAssignedShift = assignedShifts
      .filter((shift) => new Date(shift.startTime) > showingStart)
      .sort(
        (left, right) =>
          new Date(left.startTime).getTime() -
          new Date(right.startTime).getTime(),
      )[0];

    const movieLabel = `${showing.title} (${showing.hall})`;
    const startLabel = formatTime(showingStart);

    if (coveringShift) {
      return [
        {
          key: `outside-rule-${showing.id}`,
          title: `${movieLabel} starter kl. ${startLabel} uden for den automatiske dækning`,
          description:
            "Der er planlagt personale ved filmstarten, men filmen indgår ikke i den automatiske vagtberegning.",
          hasAssignedStaff: true,
        },
      ];
    }

    const nextShiftText = nextAssignedShift
      ? ` Næste tildelte vagt starter kl. ${formatTime(
          new Date(nextAssignedShift.startTime),
        )}.`
      : " Der er ingen senere tildelt vagt denne dag.";

    return [
      {
        key: `uncovered-${showing.id}`,
        title: `${movieLabel} starter kl. ${startLabel} uden for den automatiske dækning`,
        description:
          `Ingen tildelt medarbejder er på arbejde ved filmstarten.${nextShiftText}`,
        hasAssignedStaff: false,
      },
    ];
  });
}
