import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  getAuthenticatedAuthUserId,
  parseAuthCinemaId,
  parseOptionalAuthCinemaId,
} from './auth-controller-input';

describe('auth controller input', () => {
  it('parses valid user and cinema IDs', () => {
    expect(getAuthenticatedAuthUserId('7')).toBe(7);
    expect(parseAuthCinemaId(3)).toBe(3);
    expect(parseOptionalAuthCinemaId(null)).toBeNull();
    expect(parseOptionalAuthCinemaId('5')).toBe(5);
  });

  it.each([
    undefined,
    null,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid authenticated user ID %p', (value) => {
    expect(() =>
      getAuthenticatedAuthUserId(value),
    ).toThrow(ForbiddenException);
  });

  it.each([
    undefined,
    null,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid switch cinema ID %p', (value) => {
    expect(() => parseAuthCinemaId(value)).toThrow(
      BadRequestException,
    );
  });

  it.each([
    undefined,
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid default cinema ID %p', (value) => {
    expect(() =>
      parseOptionalAuthCinemaId(value),
    ).toThrow(BadRequestException);
  });
});
