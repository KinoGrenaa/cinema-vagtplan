import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ensureDayPeriodAdmin,
  ensureDayPeriodRange,
  getRequiredDayPeriodCinemaId,
  normalizeDayPeriodName,
  parseOptionalSortOrder,
  parseRequiredMinute,
  type AuthUser,
} from './day-period-service-helpers';

const master: AuthUser = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER',
  cinemaId: null,
};

const admin: AuthUser = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN',
  cinemaId: 7,
};

describe('day period service helpers', () => {
  it('allows master and administrator roles', () => {
    expect(() => ensureDayPeriodAdmin(master)).not.toThrow();
    expect(() => ensureDayPeriodAdmin(admin)).not.toThrow();
  });

  it('rejects employees', () => {
    expect(() =>
      ensureDayPeriodAdmin({
        ...admin,
        role: 'EMPLOYEE',
      }),
    ).toThrow(ForbiddenException);
  });

  it('uses a strict selected cinema for master', () => {
    expect(getRequiredDayPeriodCinemaId(master, '12')).toBe(12);
  });

  it.each([
    undefined,
    null,
    '',
    '1e2',
    '1.5',
    '-1',
    '9007199254740992',
  ])('rejects invalid master cinema %p', (cinemaId) => {
    expect(() =>
      getRequiredDayPeriodCinemaId(master, cinemaId),
    ).toThrow(BadRequestException);
  });

  it('uses the administrators own cinema', () => {
    expect(getRequiredDayPeriodCinemaId(admin, 99)).toBe(7);
  });

  it.each([
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid administrator cinema %p', (cinemaId) => {
    expect(() =>
      getRequiredDayPeriodCinemaId({
        ...admin,
        cinemaId,
      }),
    ).toThrow(BadRequestException);
  });

  it('normalizes the name', () => {
    expect(normalizeDayPeriodName('  Aften  ')).toBe('Aften');
  });

  it.each([undefined, null, '', '   ', 12])(
    'rejects invalid name %p',
    (name) => {
      expect(() => normalizeDayPeriodName(name)).toThrow(
        BadRequestException,
      );
    },
  );

  it.each([
    [0, 0],
    ['60', 60],
    [1439, 1439],
  ])('parses minute %p as %p', (value, expected) => {
    expect(parseRequiredMinute(value, 'Ugyldig tid')).toBe(
      expected,
    );
  });

  it.each([
    undefined,
    null,
    '',
    '1e2',
    '1.5',
    '-1',
    1440,
    '9007199254740992',
  ])('rejects invalid minute %p', (value) => {
    expect(() =>
      parseRequiredMinute(value, 'Ugyldig tid'),
    ).toThrow(BadRequestException);
  });

  it.each([
    [undefined, undefined],
    [null, undefined],
    ['', undefined],
    [0, 0],
    ['12', 12],
  ])('parses sort order %p as %p', (value, expected) => {
    expect(parseOptionalSortOrder(value)).toBe(expected);
  });

  it.each([
    '1e2',
    '1.5',
    '-1',
    -1,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid sort order %p', (value) => {
    expect(() => parseOptionalSortOrder(value)).toThrow(
      BadRequestException,
    );
  });

  it('allows a valid minute range', () => {
    expect(() => ensureDayPeriodRange(60, 120)).not.toThrow();
  });

  it.each([
    [60, 60],
    [120, 60],
  ])('rejects invalid minute range %p-%p', (start, end) => {
    expect(() => ensureDayPeriodRange(start, end)).toThrow(
      BadRequestException,
    );
  });
});
