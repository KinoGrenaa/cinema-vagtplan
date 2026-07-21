import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  getAuthenticatedUserId,
  normalizeUserCinemaMembershipIds,
  normalizeUserTheme,
  parseOptionalUserCinemaId,
  parseUserControllerId,
  requireUserSessionCinemaId,
} from './user-controller-input';

describe('user controller input', () => {
  it('parses valid IDs', () => {
    expect(parseUserControllerId('12')).toBe(12);
    expect(getAuthenticatedUserId(7)).toBe(7);
    expect(parseOptionalUserCinemaId('4')).toBe(4);
    expect(
      parseOptionalUserCinemaId(undefined),
    ).toBeUndefined();
    expect(requireUserSessionCinemaId(9)).toBe(9);
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid route user ID %p', (value) => {
    expect(() => parseUserControllerId(value)).toThrow(
      BadRequestException,
    );
  });

  it.each([
    undefined,
    null,
    0,
    -1,
    1.5,
    '1e2',
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid authenticated ID %p', (value) => {
    expect(() => getAuthenticatedUserId(value)).toThrow(
      ForbiddenException,
    );
  });

  it.each([
    null,
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid optional cinema ID %p', (value) => {
    expect(() => parseOptionalUserCinemaId(value)).toThrow(
      BadRequestException,
    );
  });

  it.each([
    undefined,
    null,
    0,
    -1,
    1.5,
    '1e2',
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid session cinema %p', (value) => {
    expect(() => requireUserSessionCinemaId(value)).toThrow(
      ForbiddenException,
    );
  });

  it('normalizes valid membership IDs', () => {
    expect(
      normalizeUserCinemaMembershipIds([1, '2', 3]),
    ).toEqual([1, 2, 3]);
  });

  it.each([
    undefined,
    null,
    [],
    [1, 1],
    [1, '1e2'],
    [1, 1.5],
    [1, -2],
    [1, Number.MAX_SAFE_INTEGER + 1],
  ])('rejects invalid membership IDs %p', (value) => {
    expect(() =>
      normalizeUserCinemaMembershipIds(value),
    ).toThrow(BadRequestException);
  });

  it('normalizes a valid theme', () => {
    expect(normalizeUserTheme('  dark  ')).toBe('dark');
  });

  it.each([
    undefined,
    null,
    '',
    '   ',
    12,
    'dark\nmode',
    'x'.repeat(33),
  ])('rejects invalid theme %p', (value) => {
    expect(() => normalizeUserTheme(value)).toThrow(
      BadRequestException,
    );
  });
});
