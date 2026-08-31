import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ensureAssignableJobFunctionUser,
  ensureJobFunctionAdmin,
  ensureJobFunctionAssignmentAdmin,
  getRequiredJobFunctionCinemaId,
  normalizeJobFunctionColor,
  normalizeJobFunctionName,
  parseOptionalSortOrder,
  parseRequiredPositiveId,
  userJobFunctionInclude,
  withJobFunctionCinemaLock,
  type AuthUser,
} from './job-function-service-helpers';

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
  canManageSchedule: true,
};

describe('job function service helpers', () => {
  it('includes the profile image when reading assigned users', () => {
    expect(userJobFunctionInclude.user.select.profileImage).toBe(true);
  });

  it('allows master and administrator roles', () => {
    expect(() =>
      ensureJobFunctionAdmin(master),
    ).not.toThrow();
    expect(() =>
      ensureJobFunctionAdmin(admin),
    ).not.toThrow();
  });

  it('rejects users without schedule administration', () => {
    expect(() =>
      ensureJobFunctionAdmin({
        ...admin,
        canManageSchedule: false,
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows user administrators to maintain qualification relations only', () => {
    const userAdministrator: AuthUser = {
      ...admin,
      canManageSchedule: false,
      canManageUsers: true,
    };

    expect(() =>
      ensureJobFunctionAssignmentAdmin(userAdministrator),
    ).not.toThrow();
    expect(() =>
      ensureJobFunctionAdmin(userAdministrator),
    ).toThrow(ForbiddenException);
  });

  it('rejects employees without either explicit permission', () => {
    expect(() =>
      ensureJobFunctionAssignmentAdmin({
        ...admin,
        role: 'EMPLOYEE',
        canManageSchedule: false,
        canManageUsers: false,
      }),
    ).toThrow(ForbiddenException);
  });

  it('uses a strict selected cinema for master', () => {
    expect(
      getRequiredJobFunctionCinemaId(
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
      getRequiredJobFunctionCinemaId(
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

  it('normalizes a valid name and color', () => {
    expect(
      normalizeJobFunctionName(
        '  Billetsalg  ',
      ),
    ).toBe('Billetsalg');
    expect(
      normalizeJobFunctionColor(' #AABBCC '),
    ).toBe('#AABBCC');
  });

  it.each([
    '',
    '   ',
    'Ugyldig\nnavn',
    'x'.repeat(201),
  ])('rejects invalid name %p', (value) => {
    expect(() =>
      normalizeJobFunctionName(value),
    ).toThrow(BadRequestException);
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
    };

    await expect(
      ensureAssignableJobFunctionUser(
        prisma as never,
        9,
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
      withJobFunctionCinemaLock(
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
