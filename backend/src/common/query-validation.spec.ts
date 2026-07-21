import { BadRequestException } from '@nestjs/common';
import {
  parseOptionalBooleanQuery,
  parseOptionalPositiveIntegerQuery,
  parseRequiredIntegerInRange,
  parseRequiredPositiveInteger,
} from './query-validation';

describe('query validation', () => {
  describe('parseRequiredPositiveInteger', () => {
    it.each([
      ['1', 1],
      ['0007', 7],
      [12, 12],
    ])('parses %p as %p', (value, expected) => {
      expect(parseRequiredPositiveInteger(value, 'Ugyldigt ID')).toBe(expected);
    });

    it.each([
      '',
      ' ',
      '1.0',
      '1.5',
      '1e2',
      '-1',
      'abc',
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      null,
      undefined,
      ['1'],
    ])('rejects %p', (value) => {
      expect(() =>
        parseRequiredPositiveInteger(value, 'Ugyldigt ID'),
      ).toThrow(BadRequestException);
    });
  });

  describe('parseOptionalPositiveIntegerQuery', () => {
    it('returns undefined when the query parameter is omitted', () => {
      expect(
        parseOptionalPositiveIntegerQuery(undefined, 'Ugyldigt ID'),
      ).toBeUndefined();
    });

    it('parses a supplied positive integer', () => {
      expect(parseOptionalPositiveIntegerQuery('9', 'Ugyldigt ID')).toBe(9);
    });

    it.each(['', '1.5', '1e2', 'abc', ['1']])('rejects %p', (value) => {
      expect(() =>
        parseOptionalPositiveIntegerQuery(value, 'Ugyldigt ID'),
      ).toThrow(BadRequestException);
    });
  });

  describe('parseOptionalBooleanQuery', () => {
    it.each([
      [undefined, false],
      ['true', true],
      ['false', false],
    ])('parses %p as %p', (value, expected) => {
      expect(parseOptionalBooleanQuery(value, 'Ugyldig værdi')).toBe(expected);
    });

    it.each(['', 'TRUE', 'False', '1', '0', true, ['true']])(
      'rejects %p',
      (value) => {
        expect(() =>
          parseOptionalBooleanQuery(value, 'Ugyldig værdi'),
        ).toThrow(BadRequestException);
      },
    );
  });

  describe('parseRequiredIntegerInRange', () => {
    it.each([1, '4', 7])('accepts %p inside the range', (value) => {
      expect(
        parseRequiredIntegerInRange(value, 1, 7, 'Ugyldig ugedag'),
      ).toBe(Number(value));
    });

    it.each([0, 8, '1.5', 'abc'])('rejects %p outside the range', (value) => {
      expect(() =>
        parseRequiredIntegerInRange(value, 1, 7, 'Ugyldig ugedag'),
      ).toThrow(BadRequestException);
    });
  });
});
