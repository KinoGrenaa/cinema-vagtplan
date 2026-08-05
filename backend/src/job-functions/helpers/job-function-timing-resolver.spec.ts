import {
  resolveJobFunctionTiming,
  roundToNearestQuarter,
} from './job-function-timing-resolver';

const baseRule = {
  filmWindowStartMinute: 600,
  filmWindowEndMinute: 1560,
  startAnchor: 'FIRST_MOVIE_START' as const,
  startOffsetMinutes: -20,
  startFixedMinute: null,
  endAnchor: 'LAST_MOVIE_END' as const,
  endOffsetMinutes: 10,
  endFixedMinute: null,
  fallbackStartMinute: 720,
  fallbackEndMinute: 1320,
  roundStartToNearestQuarter: true,
  roundEndToNearestQuarter: true,
  restrictMovieStartsToWindow: true,
};

describe('job-function-timing-resolver', () => {
  it.each([
    [960, 960],
    [961, 960],
    [967, 960],
    [968, 975],
    [974, 975],
    [975, 975],
    [976, 975],
    [982, 975],
    [983, 990],
  ])('afrunder %i til nærmeste hele kvarter', (value, expected) => {
    expect(roundToNearestQuarter(value)).toBe(expected);
  });

  it('anvender offset før kvartersafrunding', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      baseRule,
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T16:01:00+02:00'),
          endTime: new Date('2026-08-15T18:04:00+02:00'),
        },
      ],
    );

    expect(result.startMinute).toBe(15 * 60 + 45);
    expect(result.endMinute).toBe(18 * 60 + 15);
    expect(result.usedFallback).toBe(false);
  });

  it('lader offset føre vagten uden for tidsrummet, når filmstarten ligger indenfor', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      {
        ...baseRule,
        filmWindowStartMinute: 16 * 60,
        filmWindowEndMinute: 23 * 60,
        startOffsetMinutes: -60,
        roundStartToNearestQuarter: false,
        roundEndToNearestQuarter: false,
      },
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T16:00:00+02:00'),
          endTime: new Date('2026-08-15T18:00:00+02:00'),
        },
      ],
    );

    expect(result.sourceMovieShowingIds).toEqual([1]);
    expect(result.startMinute).toBe(15 * 60);
  });

  it('ignorerer filmstarter uden for tidsrummet og bruger fallback uden filmoffset', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      {
        ...baseRule,
        filmWindowStartMinute: 16 * 60,
        filmWindowEndMinute: 23 * 60,
        startOffsetMinutes: -60,
        fallbackStartMinute: 16 * 60,
        fallbackEndMinute: 20 * 60,
        roundStartToNearestQuarter: false,
        roundEndToNearestQuarter: false,
      },
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T15:45:00+02:00'),
          endTime: new Date('2026-08-15T17:45:00+02:00'),
        },
      ],
    );

    expect(result.sourceMovieShowingIds).toEqual([]);
    expect(result.usedFallback).toBe(true);
    expect(result.startMinute).toBe(16 * 60);
    expect(result.endMinute).toBe(20 * 60);
  });

  it('medregner alle filmstarter, når tidsbegrænsningen er slået fra', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      {
        ...baseRule,
        filmWindowStartMinute: 16 * 60,
        filmWindowEndMinute: 23 * 60,
        startOffsetMinutes: -60,
        roundStartToNearestQuarter: false,
        roundEndToNearestQuarter: false,
        restrictMovieStartsToWindow: false,
      },
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T15:45:00+02:00'),
          endTime: new Date('2026-08-15T17:45:00+02:00'),
        },
      ],
    );

    expect(result.sourceMovieShowingIds).toEqual([1]);
    expect(result.usedFallback).toBe(false);
    expect(result.startMinute).toBe(14 * 60 + 45);
  });

  it('kan styre mødetids- og fyraftensafrunding hver for sig', () => {
    const startOnly = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      {
        ...baseRule,
        roundStartToNearestQuarter: true,
        roundEndToNearestQuarter: false,
      },
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T16:01:00+02:00'),
          endTime: new Date('2026-08-15T18:04:00+02:00'),
        },
      ],
    );
    const endOnly = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      {
        ...baseRule,
        roundStartToNearestQuarter: false,
        roundEndToNearestQuarter: true,
      },
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T16:01:00+02:00'),
          endTime: new Date('2026-08-15T18:04:00+02:00'),
        },
      ],
    );

    expect(startOnly.startMinute).toBe(15 * 60 + 45);
    expect(startOnly.endMinute).toBe(18 * 60 + 14);
    expect(endOnly.startMinute).toBe(15 * 60 + 41);
    expect(endOnly.endMinute).toBe(18 * 60 + 15);
  });

  it('bruger fallback uden filmoffset og afrunder fallback', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      { ...baseRule, fallbackStartMinute: 721, fallbackEndMinute: 1319 },
      [],
    );

    expect(result.startMinute).toBe(12 * 60);
    expect(result.endMinute).toBe(22 * 60);
    expect(result.usedFallback).toBe(true);
  });

  it('medtager film efter midnat i tidsrummet for filmvisninger', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      { ...baseRule, filmWindowStartMinute: 1200, filmWindowEndMinute: 1560 },
      [
        {
          id: 2,
          startTime: new Date('2026-08-16T01:00:00+02:00'),
          endTime: new Date('2026-08-16T02:00:00+02:00'),
        },
      ],
    );

    expect(result.sourceMovieShowingIds).toEqual([2]);
    expect(result.startMinute).toBe(24 * 60 + 45);
    expect(result.endMinute).toBe(26 * 60 + 15);
  });
  it('ignorerer filmstarter fra senere planlægningsdage, når tidsbegrænsningen er slået fra', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      {
        ...baseRule,
        startOffsetMinutes: 0,
        endOffsetMinutes: 0,
        roundStartToNearestQuarter: false,
        roundEndToNearestQuarter: false,
        restrictMovieStartsToWindow: false,
      },
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T16:00:00+02:00'),
          endTime: new Date('2026-08-15T18:00:00+02:00'),
        },
        {
          id: 2,
          startTime: new Date('2026-08-31T20:00:00+02:00'),
          endTime: new Date('2026-08-31T22:00:00+02:00'),
        },
      ],
    );

    expect(result.sourceMovieShowingIds).toEqual([1]);
    expect(result.startMinute).toBe(16 * 60);
    expect(result.endMinute).toBe(18 * 60);
  });

  it('medtager kun den udtrykkelige fortsættelse efter midnat i et tidsrum over midnat', () => {
    const result = resolveJobFunctionTiming(
      new Date('2026-08-15T10:00:00+02:00'),
      {
        ...baseRule,
        filmWindowStartMinute: 20 * 60,
        filmWindowEndMinute: 2 * 60,
        startOffsetMinutes: 0,
        endOffsetMinutes: 0,
        roundStartToNearestQuarter: false,
        roundEndToNearestQuarter: false,
        restrictMovieStartsToWindow: true,
      },
      [
        {
          id: 1,
          startTime: new Date('2026-08-15T21:00:00+02:00'),
          endTime: new Date('2026-08-15T23:00:00+02:00'),
        },
        {
          id: 2,
          startTime: new Date('2026-08-16T01:00:00+02:00'),
          endTime: new Date('2026-08-16T02:00:00+02:00'),
        },
        {
          id: 3,
          startTime: new Date('2026-08-16T03:00:00+02:00'),
          endTime: new Date('2026-08-16T05:00:00+02:00'),
        },
        {
          id: 4,
          startTime: new Date('2026-08-17T01:00:00+02:00'),
          endTime: new Date('2026-08-17T02:00:00+02:00'),
        },
      ],
    );

    expect(result.sourceMovieShowingIds).toEqual([1, 2]);
    expect(result.startMinute).toBe(21 * 60);
    expect(result.endMinute).toBe(26 * 60);
  });

  it('afviser en beregnet vagt på 24 timer eller mere', () => {
    expect(() =>
      resolveJobFunctionTiming(
        new Date('2026-08-15T10:00:00+02:00'),
        {
          ...baseRule,
          startOffsetMinutes: 0,
          endOffsetMinutes: 24 * 60,
          roundStartToNearestQuarter: false,
          roundEndToNearestQuarter: false,
          restrictMovieStartsToWindow: false,
        },
        [
          {
            id: 1,
            startTime: new Date('2026-08-15T16:00:00+02:00'),
            endTime: new Date('2026-08-15T18:00:00+02:00'),
          },
        ],
      ),
    ).toThrow('24 timer eller mere');
  });

});
