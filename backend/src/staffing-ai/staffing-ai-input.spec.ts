import { BadRequestException } from '@nestjs/common';
import {
  parseStaffingAiDate,
  parseStaffingAiDateRange,
  parseStaffingAiId,
  parseStaffingAiLimit,
} from './staffing-ai-input';

describe('staffing AI input', () => {
  it('parses valid IDs and limits', () => {
    expect(
      parseStaffingAiId('7', 'Ugyldigt ID'),
    ).toBe(7);
    expect(parseStaffingAiLimit('5')).toBe(5);
    expect(parseStaffingAiLimit(25)).toBe(20);
  });

  it.each([
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid ID %p', (value) => {
    expect(() =>
      parseStaffingAiId(value, 'Ugyldigt ID'),
    ).toThrow(BadRequestException);
  });

  it.each([
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid limit %p', (value) => {
    expect(() =>
      parseStaffingAiLimit(value),
    ).toThrow(BadRequestException);
  });

  it('clones a valid Date instance', () => {
    const source = new Date('2026-07-21T08:00:00.000Z');
    const parsed = parseStaffingAiDate(
      source,
      'Ugyldig dato',
    );

    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
  });

  it.each([
    '2026-07-21T08:00:00.000Z',
    '2026-07-21T10:00:00+02:00',
    '2026-07-21T08:00Z',
    '2024-02-29T08:00:00Z',
  ])('accepts zoned ISO date %p', (value) => {
    expect(
      parseStaffingAiDate(value, 'Ugyldig dato'),
    ).toBeInstanceOf(Date);
  });

  it.each([
    undefined,
    null,
    '',
    ' 2026-07-21T08:00:00Z',
    '2026-07-21',
    '2026-07-21T08:00:00',
    '2026-02-30T08:00:00Z',
    '2025-02-29T08:00:00Z',
    '2026-13-01T08:00:00Z',
    '2026-07-21T24:00:00Z',
    '2026-07-21T08:60:00Z',
    '2026-07-21T08:00:60Z',
    '2026-07-21T08:00:00+24:00',
    '2026-07-21T08:00:00+02:60',
    'tekst',
    new Date('invalid'),
  ])('rejects invalid date %p', (value) => {
    expect(() =>
      parseStaffingAiDate(value, 'Ugyldig dato'),
    ).toThrow(BadRequestException);
  });

  it('accepts a valid time range', () => {
    expect(
      parseStaffingAiDateRange(
        '2026-07-21T08:00:00Z',
        '2026-07-21T16:00:00Z',
      ),
    ).toEqual({
      start: new Date('2026-07-21T08:00:00Z'),
      end: new Date('2026-07-21T16:00:00Z'),
    });
  });

  it('rejects a reversed or empty time range', () => {
    expect(() =>
      parseStaffingAiDateRange(
        '2026-07-21T16:00:00Z',
        '2026-07-21T08:00:00Z',
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      parseStaffingAiDateRange(
        '2026-07-21T08:00:00Z',
        '2026-07-21T08:00:00Z',
      ),
    ).toThrow(BadRequestException);
  });
});
