import { BadRequestException } from '@nestjs/common';
import {
  normalizeSystemErrorResolutionNote,
  normalizeSystemErrorSeverity,
  normalizeSystemErrorStatus,
} from './system-error-log-input';

describe('system error log input', () => {
  it.each([
    ['error', 'ERROR'],
    [' WARNING ', 'WARNING'],
    ['CRITICAL', 'CRITICAL'],
  ])('normalizes severity %p as %p', (value, expected) => {
    expect(normalizeSystemErrorSeverity(value)).toBe(expected);
  });

  it('allows omitted severity', () => {
    expect(
      normalizeSystemErrorSeverity(undefined),
    ).toBeUndefined();
  });

  it.each(['', ' ', 'fatal', 1, ['ERROR']])(
    'rejects invalid severity %p',
    (value) => {
      expect(() =>
        normalizeSystemErrorSeverity(value),
      ).toThrow(BadRequestException);
    },
  );

  it.each([
    ['new', 'NEW'],
    [' RESOLVED ', 'RESOLVED'],
    ['IGNORED', 'IGNORED'],
  ])('normalizes status %p as %p', (value, expected) => {
    expect(normalizeSystemErrorStatus(value)).toBe(expected);
  });

  it('allows omitted status', () => {
    expect(
      normalizeSystemErrorStatus(undefined),
    ).toBeUndefined();
  });

  it.each(['', ' ', 'closed', 1, ['NEW']])(
    'rejects invalid status %p',
    (value) => {
      expect(() =>
        normalizeSystemErrorStatus(value),
      ).toThrow(BadRequestException);
    },
  );

  it('trims a valid resolution note', () => {
    expect(
      normalizeSystemErrorResolutionNote('  Rettet i deploy  '),
    ).toBe('Rettet i deploy');
  });

  it.each([
    undefined,
    null,
    '',
    '   ',
    12,
    {},
    'x'.repeat(2001),
    'Ugyldig\u0000note',
  ])('rejects invalid resolution note %p', (value) => {
    expect(() =>
      normalizeSystemErrorResolutionNote(value),
    ).toThrow(BadRequestException);
  });
});
