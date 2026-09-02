import { BadRequestException } from '@nestjs/common';
import {
  normalizeCinemaSettingsBody,
  normalizeCreateCinemaBody,
  parseCinemaControllerId,
} from './cinema-controller-input';

describe('cinema controller input', () => {
  it('parses a valid cinema ID', () => {
    expect(parseCinemaControllerId('12')).toBe(12);
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid cinema ID %p', (value) => {
    expect(() => parseCinemaControllerId(value)).toThrow(
      BadRequestException,
    );
  });

  it('normalizes a create body', () => {
    expect(
      normalizeCreateCinemaBody({
        name: '  Kino Nord  ',
      }),
    ).toEqual({
      name: 'Kino Nord',
    });
  });

  it.each([
    undefined,
    null,
    [],
    'tekst',
    {
      name: '   ',
    },
    {
      name: 'Ugyldig\nbiograf',
    },
    {
      name: 'x'.repeat(201),
    },
  ])('rejects invalid create body %p', (body) => {
    expect(() => normalizeCreateCinemaBody(body)).toThrow(
      BadRequestException,
    );
  });

  it('normalizes valid cinema settings', () => {
    const result = normalizeCinemaSettingsBody({
      name: '  Kino Syd  ',
      allowShiftTradePool: true,
      staffingLoadWarningEnabled: true,
      staffingLoadWarningMinSoldSeats: 175,
      staffingLoadWarningMaxTicketsPerEmployee: 55,
      clockInDeviationToleranceMinutes: '15',
      dailyOvertimeThreshold: 8.5,
      weeklyOvertimeThreshold: 37,
      payrollPeriodModel: 'FIXED_DAY_TO_DAY',
      payrollPeriodStartDay: '21',
      payrollPeriodEndDay: 20,
      payrollPeriodAnchorDate: '2026-07-21',
      payrollPayoutRule: 'FIXED_DAY_OF_MONTH',
      payrollPayoutDay: 25,
    });

    expect(result).toMatchObject({
      name: 'Kino Syd',
      allowShiftTradePool: true,
      staffingLoadWarningEnabled: true,
      staffingLoadWarningMinSoldSeats: 175,
      staffingLoadWarningMaxTicketsPerEmployee: 55,
      clockInDeviationToleranceMinutes: 15,
      dailyOvertimeThreshold: 8.5,
      weeklyOvertimeThreshold: 37,
      payrollPeriodModel: 'FIXED_DAY_TO_DAY',
      payrollPeriodStartDay: 21,
      payrollPeriodEndDay: 20,
      payrollPayoutRule: 'FIXED_DAY_OF_MONTH',
      payrollPayoutDay: 25,
    });
    expect(
      result.payrollPeriodAnchorDate?.toISOString(),
    ).toBe('2026-07-21T00:00:00.000Z');
  });

  it('accepts zero deviation tolerances', () => {
    expect(
      normalizeCinemaSettingsBody({
        clockInDeviationToleranceMinutes: 0,
        clockOutDeviationToleranceMinutes: 0,
      }),
    ).toMatchObject({
      clockInDeviationToleranceMinutes: 0,
      clockOutDeviationToleranceMinutes: 0,
    });
  });

  it.each([
    {
      allowShiftTradePool: 'true',
    },
    {
      staffingLoadWarningEnabled: 'true',
    },
    {
      staffingLoadWarningMinSoldSeats: -1,
    },
    {
      staffingLoadWarningMaxTicketsPerEmployee: 0,
    },
    {
      clockInDeviationToleranceMinutes: '1e2',
    },
    {
      dailyOvertimeThreshold: 24.5,
    },
    {
      weeklyOvertimeThreshold: Number.NaN,
    },
    {
      payrollPeriodModel: 'MONTHLY',
    },
    {
      payrollPeriodStartDay: 0,
    },
    {
      payrollPeriodEndDay: 32,
    },
    {
      payrollPeriodAnchorDate: '2026-02-30',
    },
    {
      payrollPayoutRule: 'LAST_DAY',
    },
    {
      payrollPayoutDay: 0,
    },
  ])('rejects invalid settings %p', (body) => {
    expect(() => normalizeCinemaSettingsBody(body)).toThrow(
      BadRequestException,
    );
  });

  it('allows a cleared anchor date', () => {
    expect(
      normalizeCinemaSettingsBody({
        payrollPeriodAnchorDate: null,
      }).payrollPeriodAnchorDate,
    ).toBeNull();
  });
});
