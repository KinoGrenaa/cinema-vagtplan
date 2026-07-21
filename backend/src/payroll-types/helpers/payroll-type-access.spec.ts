import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ensurePayrollTypeAdmin,
  getRequiredPayrollTypeCinemaId,
  type AuthUser,
} from './payroll-type-access';

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

describe('payroll type access', () => {
  it('allows administrators and master users', () => {
    expect(() => ensurePayrollTypeAdmin(master)).not.toThrow();
    expect(() => ensurePayrollTypeAdmin(admin)).not.toThrow();
  });

  it('rejects employees', () => {
    expect(() =>
      ensurePayrollTypeAdmin({
        ...admin,
        role: 'EMPLOYEE',
      }),
    ).toThrow(ForbiddenException);
  });

  it('uses the selected cinema for a master user', () => {
    expect(getRequiredPayrollTypeCinemaId(master, 12)).toBe(12);
  });

  it.each([
    undefined,
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid master cinema context %p', (cinemaId) => {
    expect(() =>
      getRequiredPayrollTypeCinemaId(master, cinemaId),
    ).toThrow(BadRequestException);
  });

  it('uses the administrators own cinema', () => {
    expect(getRequiredPayrollTypeCinemaId(admin, 99)).toBe(7);
  });

  it.each([null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid administrator cinema %p',
    (cinemaId) => {
      expect(() =>
        getRequiredPayrollTypeCinemaId({
          ...admin,
          cinemaId,
        }),
      ).toThrow(BadRequestException);
    },
  );
});
