export type JobFunctionTimingAnchorValue =
  | 'FIRST_MOVIE_START'
  | 'FIRST_MOVIE_END'
  | 'LAST_MOVIE_START'
  | 'LAST_MOVIE_END'
  | 'FIXED_TIME';

export type TimingMovieShowing = {
  id?: number;
  startTime: Date;
  endTime: Date;
};

export type TimingRuleInput = {
  filmWindowStartMinute: number;
  filmWindowEndMinute: number;
  startAnchor: JobFunctionTimingAnchorValue;
  startOffsetMinutes: number;
  startFixedMinute: number | null;
  endAnchor: JobFunctionTimingAnchorValue;
  endOffsetMinutes: number;
  endFixedMinute: number | null;
  fallbackStartMinute: number | null;
  fallbackEndMinute: number | null;
  roundStartToNearestQuarter: boolean;
  roundEndToNearestQuarter: boolean;
  restrictMovieStartsToWindow: boolean;
};

export type ResolvedJobFunctionTiming = {
  startMinute: number;
  endMinute: number;
  usedFallback: boolean;
  sourceMovieShowingIds: number[];
  explanation: {
    restrictMovieStartsToWindow: boolean;
    filmWindowStartMinute: number;
    filmWindowEndMinute: number;
    rawStartMinute: number;
    rawEndMinute: number;
    offsetStartMinute: number;
    offsetEndMinute: number;
    limitedStartMinute: number;
    limitedEndMinute: number;
    roundedStartMinute: number;
    roundedEndMinute: number;
  };
};

const MINUTES_PER_DAY = 24 * 60;

function normalizeWindowEnd(startMinute: number, endMinute: number) {
  return endMinute <= startMinute ? endMinute + MINUTES_PER_DAY : endMinute;
}

function getCopenhagenParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function dateKey(value: Date) {
  const parts = getCopenhagenParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function minuteRelativeToPlanningDate(value: Date, planningDate: Date) {
  const valueParts = getCopenhagenParts(value);
  const planningParts = getCopenhagenParts(planningDate);
  const valueDay = Date.UTC(valueParts.year, valueParts.month - 1, valueParts.day);
  const planningDay = Date.UTC(
    planningParts.year,
    planningParts.month - 1,
    planningParts.day,
  );
  const dayOffset = Math.round((valueDay - planningDay) / 86_400_000);
  return dayOffset * MINUTES_PER_DAY + valueParts.hour * 60 + valueParts.minute;
}

function resolveMovieAnchor(
  anchor: JobFunctionTimingAnchorValue,
  movies: Array<{ startMinute: number; endMinute: number }>,
) {
  if (movies.length === 0 || anchor === 'FIXED_TIME') return null;

  const sorted = [...movies].sort((left, right) => left.startMinute - right.startMinute);
  if (anchor === 'FIRST_MOVIE_START') return sorted[0].startMinute;
  if (anchor === 'FIRST_MOVIE_END') return sorted[0].endMinute;
  if (anchor === 'LAST_MOVIE_START') return sorted[sorted.length - 1].startMinute;
  return sorted[sorted.length - 1].endMinute;
}

export function roundToNearestQuarter(minute: number) {
  return Math.round(minute / 15) * 15;
}

export function resolveJobFunctionTiming(
  planningDate: Date,
  rule: TimingRuleInput,
  movieShowings: TimingMovieShowing[],
): ResolvedJobFunctionTiming {
  const filmWindowStartMinute = rule.filmWindowStartMinute;
  const filmWindowEndMinute = normalizeWindowEnd(
    filmWindowStartMinute,
    rule.filmWindowEndMinute,
  );
  const planningDateKey = dateKey(planningDate);

  const allMovies = movieShowings
    .map((showing) => ({
      id: showing.id,
      startMinute: minuteRelativeToPlanningDate(showing.startTime, planningDate),
      endMinute: minuteRelativeToPlanningDate(showing.endTime, planningDate),
      localStartDate: dateKey(showing.startTime),
    }))
    .map((showing) => ({
      ...showing,
      endMinute:
        showing.endMinute <= showing.startMinute
          ? showing.endMinute + MINUTES_PER_DAY
          : showing.endMinute,
    }))
    .filter(
      (showing) =>
        showing.localStartDate === planningDateKey ||
        showing.startMinute >= MINUTES_PER_DAY,
    );

  const movies = rule.restrictMovieStartsToWindow
    ? allMovies.filter(
        (showing) =>
          showing.startMinute >= filmWindowStartMinute &&
          showing.startMinute < filmWindowEndMinute,
      )
    : allMovies;

  const movieStart = resolveMovieAnchor(rule.startAnchor, movies);
  const movieEnd = resolveMovieAnchor(rule.endAnchor, movies);
  const startUsesFallback =
    rule.startAnchor !== 'FIXED_TIME' && movieStart === null;
  const endUsesFallback = rule.endAnchor !== 'FIXED_TIME' && movieEnd === null;
  const rawStartMinute =
    rule.startAnchor === 'FIXED_TIME'
      ? rule.startFixedMinute
      : movieStart ?? rule.fallbackStartMinute;
  const rawEndMinute =
    rule.endAnchor === 'FIXED_TIME'
      ? rule.endFixedMinute
      : movieEnd ?? rule.fallbackEndMinute;

  if (rawStartMinute === null || rawEndMinute === null) {
    throw new Error('Tidsreglen mangler et brugbart filmanker eller fallbacktidspunkt.');
  }

  const usedFallback = startUsesFallback || endUsesFallback;

  // Forskydninger hører til film- eller fasttidsankeret. Fallbacktiderne er
  // allerede de konkrete tider, der skal bruges, når ingen film matcher.
  const offsetStartMinute =
    rawStartMinute + (startUsesFallback ? 0 : rule.startOffsetMinutes);
  let offsetEndMinute =
    rawEndMinute + (endUsesFallback ? 0 : rule.endOffsetMinutes);
  while (offsetEndMinute <= offsetStartMinute) offsetEndMinute += MINUTES_PER_DAY;

  const roundedStartMinute = rule.roundStartToNearestQuarter
    ? roundToNearestQuarter(offsetStartMinute)
    : offsetStartMinute;
  const roundedEndMinute = rule.roundEndToNearestQuarter
    ? roundToNearestQuarter(offsetEndMinute)
    : offsetEndMinute;

  if (roundedEndMinute <= roundedStartMinute) {
    throw new Error('Tidsreglen giver et sluttidspunkt, der ikke ligger efter starttidspunktet.');
  }

  return {
    startMinute: roundedStartMinute,
    endMinute: roundedEndMinute,
    usedFallback,
    sourceMovieShowingIds: movies
      .map((movie) => movie.id)
      .filter((id): id is number => Number.isInteger(id)),
    explanation: {
      restrictMovieStartsToWindow: rule.restrictMovieStartsToWindow,
      filmWindowStartMinute,
      filmWindowEndMinute,
      rawStartMinute,
      rawEndMinute,
      offsetStartMinute,
      offsetEndMinute,
      // Beholdes i preview-kontrakten for kompatibilitet. Der foretages ikke
      // længere en hård beskæring af den beregnede vagt til filmstartstidsrummet.
      limitedStartMinute: offsetStartMinute,
      limitedEndMinute: offsetEndMinute,
      roundedStartMinute,
      roundedEndMinute,
    },
  };
}
