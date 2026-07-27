import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  normalizeMonthPlanUpdateBody,
  parseMonthPlanMonth,
  parseMonthPlanYear,
  parseOptionalCount,
  parseOptionalDateTime,
  parseOptionalPositiveId,
  parseOptionalText,
  resolveMonthPlanCinemaId,
  withMonthPlanCinemaLock,
} from './month-plan-service-helpers';

describe('month plan service helpers', () => {
  it('resolves valid MASTER and ADMIN cinema IDs', () => {
    expect(
      resolveMonthPlanCinemaId(
        {
          role: 'MASTER',
          cinemaId: null,
        },
        '7',
      ),
    ).toBe(7);

    expect(
      resolveMonthPlanCinemaId({
        role: 'ADMIN',
        cinemaId: 9,
      }),
    ).toBe(9);
  });

  it.each([
    undefined,
    null,
    '',
    '1e2',
    '1.5',
    '-1',
    '2147483648',
    '9007199254740992',
  ])('rejects invalid MASTER cinema %p', (value) => {
    expect(() =>
      resolveMonthPlanCinemaId(
        {
          role: 'MASTER',
          cinemaId: null,
        },
        value,
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    null,
    0,
    -1,
    1.5,
    2_147_483_648,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid ADMIN cinema %p', (cinemaId) => {
    expect(() =>
      resolveMonthPlanCinemaId({
        role: 'ADMIN',
        cinemaId,
      }),
    ).toThrow(ForbiddenException);
  });

  it.each([
    ['2026', 2026],
    [2027, 2027],
  ])('parses year %p as %p', (value, expected) => {
    expect(parseMonthPlanYear(value)).toBe(
      expected,
    );
  });

  it.each([
    '1e3',
    '2026.5',
    1999,
    2101,
  ])('rejects invalid year %p', (value) => {
    expect(() =>
      parseMonthPlanYear(value),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['07', 7],
    [12, 12],
  ])('parses month %p as %p', (value, expected) => {
    expect(parseMonthPlanMonth(value)).toBe(
      expected,
    );
  });

  it.each([
    0,
    13,
    '1e1',
    '1.5',
  ])('rejects invalid month %p', (value) => {
    expect(() =>
      parseMonthPlanMonth(value),
    ).toThrow(BadRequestException);
  });

  it.each([
    '1e2',
    '1.5',
    '-1',
    '9007199254740992',
  ])('rejects invalid optional ID %p', (value) => {
    expect(() =>
      parseOptionalPositiveId(
        value,
        'Skabelon',
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['0', 0],
    ['12', 12],
  ])('parses count %p as %p', (value, expected) => {
    expect(
      parseOptionalCount(value, 'Antal'),
    ).toBe(expected);
  });

  it.each([
    '-1',
    '1.5',
    '1e2',
    '2147483648',
  ])('rejects invalid count %p', (value) => {
    expect(() =>
      parseOptionalCount(value, 'Antal'),
    ).toThrow(BadRequestException);
  });

  it('normalizes a valid note', () => {
    expect(
      parseOptionalText(
        '  Sommerplan  ',
        'Note',
      ),
    ).toBe('Sommerplan');
  });

  it.each([
    12,
    'x'.repeat(5_001),
    'Ugyldig\u0000note',
  ])('rejects invalid note %p', (value) => {
    expect(() =>
      parseOptionalText(value, 'Note'),
    ).toThrow(BadRequestException);
  });

  it.each([
    '2026-07-21T08:00:00.000Z',
    '2026-07-21T10:00:00+02:00',
  ])('accepts zoned datetime %p', (value) => {
    expect(
      parseOptionalDateTime(
        value,
        'Tidspunkt',
      ),
    ).toBeInstanceOf(Date);
  });

  it.each([
    '2026-07-21',
    '2026-07-21T08:00:00',
    '2026-02-30T08:00:00Z',
    '2026-07-21T24:00:00Z',
    '2026-07-21T08:00:00+14:30',
  ])('rejects invalid datetime %p', (value) => {
    expect(() =>
      parseOptionalDateTime(
        value,
        'Tidspunkt',
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    null,
    [],
    'tekst',
  ])('rejects invalid update body %p', (value) => {
    expect(() =>
      normalizeMonthPlanUpdateBody(value),
    ).toThrow(BadRequestException);
  });

  it('serializes writes with an advisory lock', async () => {
    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (value: any) => unknown,
        ) => callback(transaction),
      ),
    };
    const action = jest
      .fn()
      .mockResolvedValue('ok');

    await expect(
      withMonthPlanCinemaLock(
        prisma as never,
        7,
        action,
      ),
    ).resolves.toBe('ok');

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);

    const [queryParts, namespace, lockedCinemaId] =
      transaction.$executeRaw.mock.calls[0];
    const query = queryParts.join('VALUE');

    expect(query).toContain(
      'CAST(VALUE AS integer)',
    );
    expect(
      query.match(/CAST\(VALUE AS integer\)/g),
    ).toHaveLength(2);
    expect(namespace).toBe(1_296_808_012);
    expect(lockedCinemaId).toBe(7);
    expect(action).toHaveBeenCalledWith(
      transaction,
    );
  });

  it.each([
    0,
    -1,
    1.5,
    2_147_483_648,
  ])(
    'rejects advisory lock cinema ID %p outside the PostgreSQL integer range',
    async (cinemaId) => {
      const prisma = {
        $transaction: jest.fn(),
      };
      const action = jest.fn();

      await expect(
        withMonthPlanCinemaLock(
          prisma as never,
          cinemaId,
          action,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(
        prisma.$transaction,
      ).not.toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
    },
  );
});
