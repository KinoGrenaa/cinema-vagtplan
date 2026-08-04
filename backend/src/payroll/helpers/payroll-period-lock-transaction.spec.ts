import { lockPayrollPeriod } from './payroll-period-lock-flow';
import { ensurePayrollEntriesApproved } from './payroll-period-export';
import { acquirePayrollPeriodMutationLockForPeriod } from './payroll-period-mutation-lock';
import { includePendingPayrollAdjustmentsInPeriod } from './payroll-adjustment-export';
import { createPayrollCalculationRun } from './payroll-calculation';

jest.mock('./payroll-period-export', () => ({
  ensurePayrollEntriesApproved: jest.fn(),
}));

jest.mock('./payroll-period-mutation-lock', () => ({
  acquirePayrollPeriodMutationLockForPeriod:
    jest.fn(),
}));

jest.mock('./payroll-adjustment-export', () => ({
  includePendingPayrollAdjustmentsInPeriod: jest.fn(),
}));

jest.mock('./payroll-calculation', () => ({
  createPayrollCalculationRun: jest.fn(),
}));

describe('payroll period lock transaction', () => {
  const user = {
    sub: 7,
    role: 'ADMIN',
    cinemaId: 2,
    canManagePayroll: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      acquirePayrollPeriodMutationLockForPeriod as jest.Mock
    ).mockResolvedValue(undefined);
    (
      ensurePayrollEntriesApproved as jest.Mock
    ).mockResolvedValue(undefined);
    (
      includePendingPayrollAdjustmentsInPeriod as jest.Mock
    ).mockResolvedValue(0);
    (createPayrollCalculationRun as jest.Mock).mockResolvedValue({ id: 91 });
  });

  it('låser, genkontrollerer og opdaterer i samme transaktion', async () => {
    const period = {
      id: 12,
      cinemaId: 2,
      status: 'LOCKED',
    };
    const tx = {
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(period),
        create: jest.fn().mockResolvedValue(period),
      },
      payrollType: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
        }),
      },
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 41,
            payrollType: null,
            shift: null,
          },
          {
            id: 42,
            payrollType: {
              id: 6,
            },
            shift: null,
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (
            transaction: typeof tx,
          ) => unknown,
        ) => callback(tx),
      ),
    };

    await expect(
      lockPayrollPeriod(
        prisma as never,
        user as never,
        '2026-07-21',
        '2026-08-20',
      ),
    ).resolves.toBe(period);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(
      acquirePayrollPeriodMutationLockForPeriod,
    ).toHaveBeenCalledWith(tx, {
      cinemaId: 2,
      startDate: '2026-07-21',
      endDate: '2026-08-20',
    });
    expect(
      ensurePayrollEntriesApproved,
    ).toHaveBeenCalledWith(
      tx,
      user,
      '2026-07-21',
      '2026-08-20',
      undefined,
      undefined,
      'LOCK',
    );
    expect(
      (
        acquirePayrollPeriodMutationLockForPeriod as jest.Mock
      ).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (
        ensurePayrollEntriesApproved as jest.Mock
      ).mock.invocationCallOrder[0],
    );
    expect(tx.payrollPeriod.create).toHaveBeenCalledTimes(1);
    expect(tx.timeEntry.update).toHaveBeenCalledTimes(2);
    expect(includePendingPayrollAdjustmentsInPeriod).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        cinemaId: 2,
        payrollPeriodId: 12,
        changedByUserId: 7,
        reason: 'Medtaget i låst lønperiode.',
      }),
    );
    expect(createPayrollCalculationRun).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        cinemaId: 2,
        payrollPeriodId: 12,
        status: 'LOCKED',
      }),
    );
    expect(
      (includePendingPayrollAdjustmentsInPeriod as jest.Mock).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      (createPayrollCalculationRun as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('lader en registreringsfejl afbryde hele transaktionen', async () => {
    const tx = {
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: 12,
        }),
      },
      payrollType: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 41,
            payrollType: null,
            shift: null,
          },
          {
            id: 42,
            payrollType: null,
            shift: null,
          },
        ]),
        update: jest
          .fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(
            new Error(
              'Registreringen kunne ikke låses',
            ),
          ),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (
            transaction: typeof tx,
          ) => unknown,
        ) => callback(tx),
      ),
    };

    await expect(
      lockPayrollPeriod(
        prisma as never,
        user as never,
        '2026-07-21',
        '2026-08-20',
      ),
    ).rejects.toThrow(
      'Registreringen kunne ikke låses',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.payrollPeriod.create).toHaveBeenCalledTimes(1);
    expect(tx.timeEntry.update).toHaveBeenCalledTimes(2);
  });
});
