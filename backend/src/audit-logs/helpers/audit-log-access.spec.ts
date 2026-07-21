import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  getAuditLogAccessWhere,
  type CurrentUser,
} from './audit-log-access';

const master: CurrentUser = {
  sub: 1,
  role: 'MASTER',
  cinemaId: null,
};

const admin: CurrentUser = {
  sub: 2,
  role: 'ADMIN',
  cinemaId: 7,
};

describe('audit log access', () => {
  it('uses the selected cinema for a master user', () => {
    expect(getAuditLogAccessWhere(master, 12)).toEqual({
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
  ])('rejects invalid master cinema context %p', (cinemaId) => {
    expect(() =>
      getAuditLogAccessWhere(master, cinemaId),
    ).toThrow(BadRequestException);
  });

  it('uses the administrators own cinema', () => {
    expect(getAuditLogAccessWhere(admin, 99)).toEqual({
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
      getAuditLogAccessWhere({
        ...admin,
        cinemaId,
      }),
    ).toThrow(ForbiddenException);
  });
});
