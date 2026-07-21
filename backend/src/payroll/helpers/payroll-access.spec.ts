import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ensurePayrollAccess,
  ensurePayrollAdminOrMaster,
  ensurePayrollExportAccess,
  getPayrollCinemaFilter,
  type PayrollAuthUser,
} from './payroll-access';

const master: PayrollAuthUser = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER',
  cinemaId: null,
};

const admin: PayrollAuthUser = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN',
  cinemaId: 7,
};

const payrollManager: PayrollAuthUser = {
  sub: 3,
  email: 'manager@example.com',
  role: 'EMPLOYEE',
  cinemaId: 7,
  canManagePayroll: true,
};

describe('payroll access', () => {
  it('allows payroll access for supported roles', () => {
    expect(() => ensurePayrollAccess(master)).not.toThrow();
    expect(() => ensurePayrollAccess(admin)).not.toThrow();
    expect(() =>
      ensurePayrollAccess(payrollManager),
    ).not.toThrow();
  });

  it('rejects an employee without payroll permission', () => {
    expect(() =>
      ensurePayrollAccess({
        ...payrollManager,
        canManagePayroll: false,
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows export access for payroll managers', () => {
    expect(() =>
      ensurePayrollExportAccess(payrollManager),
    ).not.toThrow();
  });

  it('restricts administrative unlock operations', () => {
    expect(() =>
      ensurePayrollAdminOrMaster(master),
    ).not.toThrow();
    expect(() =>
      ensurePayrollAdminOrMaster(admin),
    ).not.toThrow();
    expect(() =>
      ensurePayrollAdminOrMaster(payrollManager),
    ).toThrow(ForbiddenException);
  });

  it('uses a valid selected cinema for master', () => {
    expect(getPayrollCinemaFilter(master, 12)).toEqual({
      cinemaId: 12,
    });
  });

  it.each([
    undefined,
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid master cinema %p', (cinemaId) => {
    expect(() =>
      getPayrollCinemaFilter(master, cinemaId),
    ).toThrow(BadRequestException);
  });

  it('uses the administrators own cinema', () => {
    expect(getPayrollCinemaFilter(admin, 99)).toEqual({
      cinemaId: 7,
    });
  });

  it.each([
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid administrator cinema %p', (cinemaId) => {
    expect(() =>
      getPayrollCinemaFilter({
        ...admin,
        cinemaId,
      }),
    ).toThrow(BadRequestException);
  });
});
