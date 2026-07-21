import { BadRequestException } from '@nestjs/common';
import {
  getCopenhagenDayRange,
  parseMovieShowingDate,
} from './movie-showing-date-range';

describe('movie showing date range', () => {
  it('normaliserer en gyldig dato', () => {
    expect(
      parseMovieShowingDate(
        ' 2026-07-21 ',
      ),
    ).toBe('2026-07-21');
  });

  it.each([
    '2026-02-30',
    '2026-13-01',
    '21-07-2026',
    'ukendt',
  ])('afviser ugyldig dato %s', (date) => {
    expect(() =>
      parseMovieShowingDate(date),
    ).toThrow(BadRequestException);
  });

  it('beregner et normalt dansk døgn', () => {
    const range =
      getCopenhagenDayRange('2026-07-21');

    expect(range.start.toISOString()).toBe(
      '2026-07-20T22:00:00.000Z',
    );
    expect(
      range.endExclusive.toISOString(),
    ).toBe('2026-07-21T22:00:00.000Z');
  });

  it('beregner 23 timer ved sommertidsskift', () => {
    const range =
      getCopenhagenDayRange('2026-03-29');

    expect(
      range.endExclusive.getTime() -
        range.start.getTime(),
    ).toBe(23 * 60 * 60 * 1000);
  });

  it('beregner 25 timer ved vintertidsskift', () => {
    const range =
      getCopenhagenDayRange('2026-10-25');

    expect(
      range.endExclusive.getTime() -
        range.start.getTime(),
    ).toBe(25 * 60 * 60 * 1000);
  });
});
