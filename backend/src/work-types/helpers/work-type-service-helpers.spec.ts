import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ensureWorkTypeAdmin,
  getPayrollTypeIdForCinema,
  getRequiredWorkTypeCinemaId,
  normalizeWorkTypeColor,
  normalizeWorkTypeName,
  parseOptionalPayrollTypeId,
  withWorkTypeCinemaLock,
  type AuthUser,
} from './work-type-service-helpers';

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

describe('work type service helpers', () => {
  it('allows master and administrator roles', () => {
    expect(() =>
      ensureWorkTypeAdmin(master),
    ).not.toThrow();
    expect(() =>
      ensureWorkTypeAdmin(admin),
    ).not.toThrow();
  });

  it('rejects employees', () => {
    expect(() =>
      ensureWorkTypeAdmin({
        ...admin,
        role: 'EMPLOYEE',
      }),
    ).toThrow(ForbiddenException);
  });

  it('uses a strict selected cinema for master', () => {
    expect(
      getRequiredWorkTypeCinemaId(
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
      getRequiredWorkTypeCinemaId(
        master,
        value,
      ),
    ).toThrow(BadRequestException);
  });

  it('normalizes a valid name and color', () => {
    expect(
      normalizeWorkTypeName('  Aften  '),
    ).toBe('Aften');
    expect(
      normalizeWorkTypeColor(' #AABBCC '),
    ).toBe('#AABBCC');
  });

  it.each([
    '',
    '   ',
    'Ugyldig\nnavn',
    'x'.repeat(201),
  ])('rejects invalid name %p', (value) => {
    expect(() =>
      normalizeWorkTypeName(value),
    ).toThrow(BadRequestException);
  });

  it.each([
    'red',
    '#123',
    '#GGGGGG',
    123,
  ])('rejects invalid color %p', (value) => {
    expect(() =>
      normalizeWorkTypeColor(value),
    ).toThrow(BadRequestException);
  });

  it.each([
    '1e2',
    '1.5',
    '-1',
    '9007199254740992',
  ])('rejects invalid payroll type ID %p', (value) => {
    expect(() =>
      parseOptionalPayrollTypeId(value),
    ).toThrow(BadRequestException);
  });

  it('requires an active payroll type in the cinema', async () => {
    const prisma = {
      payrollType: {
        findFirst: jest.fn().mockResolvedValue({
          id: 4,
        }),
      },
    };

    await expect(
      getPayrollTypeIdForCinema(
        prisma as never,
        7,
        4,
      ),
    ).resolves.toBe(4);

    expect(
      prisma.payrollType.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 4,
        cinemaId: 7,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  });

  it('serializes writes with an advisory lock', async () => {
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
      withWorkTypeCinemaLock(
        prisma as never,
        7,
        action,
      ),
    ).resolves.toBe('ok');

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(
      transaction,
    );
  });
});
