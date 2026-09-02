import { ForbiddenException } from '@nestjs/common';
import {
  ensureCinemaManageAccess,
  ensureCinemaMaster,
  ensureCinemaOperationalAdminAccess,
  ensureCinemaReadAccess,
  type CinemaControllerUser,
} from './cinema-controller-access';

const master: CinemaControllerUser = {
  sub: 1,
  email: 'master@example.com',
  role: 'MASTER',
  cinemaId: null,
};

const admin: CinemaControllerUser = {
  sub: 2,
  email: 'admin@example.com',
  role: 'ADMIN',
  cinemaId: 7,
};

describe('cinema controller access', () => {
  it('allows master-only actions for master', () => {
    expect(() => ensureCinemaMaster(master)).not.toThrow();
  });

  it('rejects master-only actions for admin', () => {
    expect(() => ensureCinemaMaster(admin)).toThrow(
      ForbiddenException,
    );
  });

  it('allows master to read and manage any valid target', () => {
    expect(() =>
      ensureCinemaReadAccess(master, 9),
    ).not.toThrow();
    expect(() =>
      ensureCinemaManageAccess(master, 9),
    ).not.toThrow();
  });

  it('allows an admin to read and manage own cinema', () => {
    expect(() =>
      ensureCinemaReadAccess(admin, 7),
    ).not.toThrow();
    expect(() =>
      ensureCinemaManageAccess(admin, 7),
    ).not.toThrow();
  });

  it('rejects cross-cinema access', () => {
    expect(() =>
      ensureCinemaReadAccess(admin, 8),
    ).toThrow(ForbiddenException);
    expect(() =>
      ensureCinemaManageAccess(admin, 8),
    ).toThrow(ForbiddenException);
  });

  it.each([
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid session cinema %p', (cinemaId) => {
    expect(() =>
      ensureCinemaReadAccess(
        {
          ...admin,
          cinemaId,
        },
        7,
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows an employee with cinema-settings permission', () => {
    expect(() =>
      ensureCinemaManageAccess(
        {
          ...admin,
          role: 'EMPLOYEE',
          canManageCinemaSettings: true,
        },
        7,
      ),
    ).not.toThrow();
  });

  it('rejects an employee without cinema-settings permission', () => {
    expect(() =>
      ensureCinemaManageAccess(
        {
          ...admin,
          role: 'EMPLOYEE',
          canManageCinemaSettings: false,
        },
        7,
      ),
    ).toThrow(ForbiddenException);
  });
  it('allows only administrators and master to handle operational warnings', () => {
    expect(() =>
      ensureCinemaOperationalAdminAccess(admin, 7),
    ).not.toThrow();
    expect(() =>
      ensureCinemaOperationalAdminAccess(master, 7),
    ).not.toThrow();
    expect(() =>
      ensureCinemaOperationalAdminAccess(
        {
          ...admin,
          role: 'EMPLOYEE',
          canManageCinemaSettings: true,
        },
        7,
      ),
    ).toThrow(ForbiddenException);
  });

});
