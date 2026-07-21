import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  formatShiftTime,
  getCopenhagenDayRange,
  resolveShiftCinemaId,
} from './shift-service-helpers';

describe('shift service helpers', () => {
  it('beregner dansk døgn over sommertidsskift', () => {
    const range =
      getCopenhagenDayRange('2026-03-29');

    expect(
      range.start.toISOString(),
    ).toBe('2026-03-28T23:00:00.000Z');
    expect(
      range.end.toISOString(),
    ).toBe('2026-03-29T22:00:00.000Z');
  });

  it.each([
    '2026-02-30',
    '2026-13-01',
    '26-01-01',
    'ukendt',
  ])('afviser ugyldig dato %s', (date) => {
    expect(() =>
      getCopenhagenDayRange(date),
    ).toThrow(BadRequestException);
  });

  it('afviser ADMINs fremmede biograf', () => {
    expect(() =>
      resolveShiftCinemaId(
        {
          sub: 7,
          email: 'admin@example.com',
          role: 'ADMIN',
          cinemaId: 2,
        },
        3,
      ),
    ).toThrow(ForbiddenException);
  });

  it('kræver valgt biograf for MASTER', () => {
    expect(() =>
      resolveShiftCinemaId(
        {
          sub: 1,
          email: 'master@example.com',
          role: 'MASTER',
          cinemaId: null,
        },
        undefined,
      ),
    ).toThrow(BadRequestException);
  });

  it('formaterer altid i dansk tidszone', () => {
    expect(
      formatShiftTime(
        new Date(
          '2026-07-10T20:00:00.000Z',
        ),
        new Date(
          '2026-07-10T22:00:00.000Z',
        ),
      ),
    ).toContain('22.00-00.00');
  });
});
