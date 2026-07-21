import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  resolveEmployeeDocumentCinemaId,
  type AuthUser,
} from './employee-document-access';

const master: AuthUser = {
  sub: 1,
  role: 'MASTER',
  cinemaId: null,
};

const admin: AuthUser = {
  sub: 2,
  role: 'ADMIN',
  cinemaId: 7,
};

describe('employee document access', () => {
  it('uses the selected cinema for master', () => {
    expect(resolveEmployeeDocumentCinemaId(master, 12)).toBe(12);
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
      resolveEmployeeDocumentCinemaId(master, cinemaId),
    ).toThrow(BadRequestException);
  });

  it('uses the administrators own cinema', () => {
    expect(resolveEmployeeDocumentCinemaId(admin, 99)).toBe(7);
  });

  it.each([
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid administrator cinema %p', (cinemaId) => {
    expect(() =>
      resolveEmployeeDocumentCinemaId({
        ...admin,
        cinemaId,
      }),
    ).toThrow(ForbiddenException);
  });
});
