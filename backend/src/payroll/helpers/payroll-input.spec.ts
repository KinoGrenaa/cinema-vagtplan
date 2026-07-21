import { BadRequestException } from '@nestjs/common';
import {
  normalizePayrollDate,
  normalizePayrollPeriod,
  parsePayrollOptionalBodyId,
  parsePayrollOptionalQueryId,
  parsePayrollRequiredId,
} from './payroll-input';

describe('payroll input', () => {
  it('parses valid required and optional IDs', () => {
    expect(
      parsePayrollRequiredId('12', 'Ugyldigt ID'),
    ).toBe(12);
    expect(
      parsePayrollOptionalQueryId('7', 'Ugyldigt ID'),
    ).toBe(7);
    expect(
      parsePayrollOptionalQueryId(undefined, 'Ugyldigt ID'),
    ).toBeUndefined();
    expect(
      parsePayrollOptionalBodyId(null, 'Ugyldigt ID'),
    ).toBeUndefined();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid required ID %p', (value) => {
    expect(() =>
      parsePayrollRequiredId(value, 'Ugyldigt ID'),
    ).toThrow(BadRequestException);
  });

  it.each([
    null,
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid optional query ID %p', (value) => {
    expect(() =>
      parsePayrollOptionalQueryId(value, 'Ugyldigt ID'),
    ).toThrow(BadRequestException);
  });

  it.each(['2024-02-29', '2026-07-21'])(
    'accepts valid date %p',
    (value) => {
      expect(normalizePayrollDate(value)).toBe(value);
    },
  );

  it.each([
    undefined,
    null,
    '',
    '2026-2-01',
    '2026-02-30',
    '2025-02-29',
    '2026-13-01',
    'tekst',
  ])('rejects invalid date %p', (value) => {
    expect(() => normalizePayrollDate(value)).toThrow(
      BadRequestException,
    );
  });

  it('accepts a valid payroll period', () => {
    expect(
      normalizePayrollPeriod('2026-06-21', '2026-07-20'),
    ).toEqual({
      startDate: '2026-06-21',
      endDate: '2026-07-20',
    });
  });

  it('accepts a one-day payroll period', () => {
    expect(
      normalizePayrollPeriod('2026-07-21', '2026-07-21'),
    ).toEqual({
      startDate: '2026-07-21',
      endDate: '2026-07-21',
    });
  });

  it('rejects a reversed payroll period', () => {
    expect(() =>
      normalizePayrollPeriod('2026-07-21', '2026-07-20'),
    ).toThrow(
      new BadRequestException(
        'Startdato skal være før eller lig med slutdato',
      ),
    );
  });
});
