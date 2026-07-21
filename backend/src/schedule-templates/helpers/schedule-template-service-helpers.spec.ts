import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ensureAssignableUserForJobFunction,
  ensureScheduleTemplateAdmin,
  getActorUserId,
  getRequiredScheduleTemplateCinemaId,
  normalizeOptionalText,
  normalizeScheduleTemplateName,
  parseOptionalDate,
  parseOptionalSortOrder,
  parseRequiredCount,
  parseRequiredPositiveId,
  parseWeekday,
  withScheduleTemplateCinemaLock,
  type AuthUser,
} from './schedule-template-service-helpers';

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

describe('schedule template service helpers', () => {
  it('allows master and administrator roles', () => {
    expect(() =>
      ensureScheduleTemplateAdmin(master),
    ).not.toThrow();
    expect(() =>
      ensureScheduleTemplateAdmin(admin),
    ).not.toThrow();
  });

  it('rejects employees', () => {
    expect(() =>
      ensureScheduleTemplateAdmin({
        ...admin,
        role: 'EMPLOYEE',
      }),
    ).toThrow(ForbiddenException);
  });

  it('uses a strict selected cinema for master', () => {
    expect(
      getRequiredScheduleTemplateCinemaId(
        master,
        '12',
      ),
    ).toBe(12);
  });

  it.each([
    undefined,
    null,
    '',
    '1e2',
    '1.5',
    '-1',
    '9007199254740992',
  ])('rejects invalid master cinema %p', (value) => {
    expect(() =>
      getRequiredScheduleTemplateCinemaId(
        master,
        value,
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    '1e2',
    '1.5',
    '-1',
    '9007199254740992',
  ])('rejects invalid positive ID %p', (value) => {
    expect(() =>
      parseRequiredPositiveId(
        value,
        'Ugyldigt ID',
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    '1e2',
    '1.5',
    '-1',
    '9007199254740992',
  ])('rejects invalid sort order %p', (value) => {
    expect(() =>
      parseOptionalSortOrder(value),
    ).toThrow(BadRequestException);
  });

  it.each([1, '7'])(
    'accepts weekday %p',
    (value) => {
      expect(parseWeekday(value)).toBe(Number(value));
    },
  );

  it.each([0, 8, '1e1', 1.5])(
    'rejects weekday %p',
    (value) => {
      expect(() =>
        parseWeekday(value),
      ).toThrow(BadRequestException);
    },
  );

  it.each([
    [undefined, 1],
    [null, 1],
    ['', 1],
    ['5', 5],
  ])('parses required count %p as %p', (value, expected) => {
    expect(parseRequiredCount(value)).toBe(expected);
  });

  it.each([0, 51, '1e1', 1.5])(
    'rejects required count %p',
    (value) => {
      expect(() =>
        parseRequiredCount(value),
      ).toThrow(BadRequestException);
    },
  );

  it('normalizes names and text', () => {
    expect(
      normalizeScheduleTemplateName(
        '  Sommerplan  ',
      ),
    ).toBe('Sommerplan');
    expect(
      normalizeOptionalText('  Note  '),
    ).toBe('Note');
  });

  it.each([
    '',
    '   ',
    'Ugyldig\nnavn',
    'x'.repeat(201),
  ])('rejects invalid name %p', (value) => {
    expect(() =>
      normalizeScheduleTemplateName(value),
    ).toThrow(BadRequestException);
  });

  it('parses a strict actor ID', () => {
    expect(getActorUserId(master)).toBe(1);
    expect(
      getActorUserId({
        ...master,
        sub: '1e2' as unknown as number,
      }),
    ).toBeNull();
  });

  it.each([
    ['2026-07-21', '2026-07-21T00:00:00.000Z'],
    ['2024-02-29', '2024-02-29T00:00:00.000Z'],
  ])(
    'parses valid date-only value %p',
    (value, expected) => {
      expect(
        parseOptionalDate(value),
      ).toEqual(new Date(expected));
    },
  );

  it('clones a valid Date input', () => {
    const source = new Date(
      '2026-07-21T00:00:00.000Z',
    );
    const parsed = parseOptionalDate(source);

    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
  });

  it.each([
    '2026-02-30',
    '2025-02-29',
    '2026-13-01',
    '2026-00-01',
    '2026-07-00',
    '2026-7-21',
    ' 2026-07-21',
    '2026-07-21 ',
    '2026-07-21T00:00:00Z',
    '21-07-2026',
    'tekst',
  ])('rejects invalid start date %p', (value) => {
    expect(() =>
      parseOptionalDate(value),
    ).toThrow(BadRequestException);
  });

  it('rejects an invalid Date input', () => {
    expect(() =>
      parseOptionalDate(new Date('invalid')),
    ).toThrow(BadRequestException);
  });

  it('serializes a write with an advisory transaction lock', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (value: any) => unknown) =>
          callback(transaction),
      ),
    };
    const action = jest.fn().mockResolvedValue('ok');

    await expect(
      withScheduleTemplateCinemaLock(
        prisma as never,
        7,
        action,
      ),
    ).resolves.toBe('ok');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(transaction);
  });

  it('accepts an active secondary cinema membership', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
          }),
      },
      userJobFunction: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 11,
          }),
      },
    };

    await expect(
      ensureAssignableUserForJobFunction(
        prisma as never,
        9,
        4,
        7,
      ),
    ).resolves.toEqual({
      id: 9,
    });

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
        isActive: true,
        role: {
          not: 'MASTER',
        },
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });
  });
});
