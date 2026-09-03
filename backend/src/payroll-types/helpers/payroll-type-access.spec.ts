import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ensurePayrollTypeAdmin,
  ensurePayrollTypeCodeAvailable,
  ensurePayrollTypeUnused,
  getRequiredPayrollTypeCinemaId,
  normalizeOptionalDescription,
  normalizeOptionalExportCode,
  normalizeOptionalIsActive,
  normalizeOptionalIsDefault,
  normalizeOptionalPayrollTypeColor,
  normalizePayrollTypeCode,
  normalizePayrollTypeName,
  withPayrollTypeCinemaLock,
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

describe('payroll type access and input', () => {
  it('allows administrators and master users', () => {
    expect(() =>
      ensurePayrollTypeAdmin(master),
    ).not.toThrow();
    expect(() =>
      ensurePayrollTypeAdmin(admin),
    ).not.toThrow();
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
    expect(
      getRequiredPayrollTypeCinemaId(
        master,
        12,
      ),
    ).toBe(12);
  });

  it.each([
    undefined,
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])(
    'rejects invalid master cinema context %p',
    (cinemaId) => {
      expect(() =>
        getRequiredPayrollTypeCinemaId(
          master,
          cinemaId,
        ),
      ).toThrow(BadRequestException);
    },
  );

  it('uses the administrators own cinema', () => {
    expect(
      getRequiredPayrollTypeCinemaId(
        admin,
        99,
      ),
    ).toBe(7);
  });

  it('normalizes required and optional text', () => {
    expect(
      normalizePayrollTypeName(' Normal tid '),
    ).toBe('Normal tid');
    expect(
      normalizePayrollTypeCode(' NORMAL '),
    ).toBe('NORMAL');
    expect(
      normalizeOptionalExportCode(' 1000 '),
    ).toBe('1000');
    expect(
      normalizeOptionalDescription(
        ' Beskrivelse ',
      ),
    ).toBe('Beskrivelse');
  });

  it.each([
    undefined,
    null,
    '',
    '   ',
    12,
    'Ugyldig\nnavn',
    'x'.repeat(201),
  ])('rejects invalid payroll type name %p', (value) => {
    expect(() =>
      normalizePayrollTypeName(value),
    ).toThrow(BadRequestException);
  });

  it.each([
    undefined,
    null,
    '',
    '   ',
    12,
    'Ugyldig\nkode',
    'x'.repeat(101),
  ])('rejects invalid payroll code %p', (value) => {
    expect(() =>
      normalizePayrollTypeCode(value),
    ).toThrow(BadRequestException);
  });

  it('normalizes optional color and booleans', () => {
    expect(
      normalizeOptionalPayrollTypeColor(
        ' #AABBCC ',
      ),
    ).toBe('#AABBCC');
    expect(
      normalizeOptionalIsDefault(true),
    ).toBe(true);
    expect(
      normalizeOptionalIsActive(false),
    ).toBe(false);
  });

  it.each([
    'red',
    '#123',
    '#GGGGGG',
    12,
  ])('rejects invalid color %p', (value) => {
    expect(() =>
      normalizeOptionalPayrollTypeColor(
        value,
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    'true',
    1,
    null,
  ])('rejects invalid boolean %p', (value) => {
    expect(() =>
      normalizeOptionalIsDefault(value),
    ).toThrow(BadRequestException);
  });

  it('rejects a duplicate payroll code', async () => {
    const prisma = {
      payrollType: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 4,
          }),
      },
    };

    await expect(
      ensurePayrollTypeCodeAvailable(
        prisma as never,
        7,
        'NORMAL',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects deletion when the payroll type is used', async () => {
    const prisma = {
      jobFunction: {
        count: jest
          .fn()
          .mockResolvedValue(1),
      },
      timeEntry: {
        count: jest
          .fn()
          .mockResolvedValue(0),
      },
      payrollAdjustment: {
        count: jest
          .fn()
          .mockResolvedValue(0),
      },
    };

    await expect(
      ensurePayrollTypeUnused(
        prisma as never,
        4,
      ),
    ).rejects.toThrow(BadRequestException);
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
      withPayrollTypeCinemaLock(
        prisma as never,
        7,
        action,
      ),
    ).resolves.toBe('ok');

    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);

    const [
      lockTemplate,
      lockNamespace,
      lockCinemaId,
    ] =
      transaction.$executeRaw.mock.calls[0];

    expect(
      Array.from(lockTemplate).join(""),
    ).toContain(
      "CAST(",
    );
    expect(
      Array.from(lockTemplate).join(""),
    ).toContain(
      "AS integer",
    );
    expect(lockNamespace).toBe(
      1_348_797_556,
    );
    expect(lockCinemaId).toBe(7);

    expect(action).toHaveBeenCalledWith(
      transaction,
    );
  });
});
