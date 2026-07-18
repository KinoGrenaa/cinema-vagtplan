import { lockPayrollPeriod } from './payroll-period-lock-flow';
import { ensurePayrollEntriesApproved } from './payroll-period-export';

jest.mock('./payroll-period-export', () => ({
  ensurePayrollEntriesApproved: jest.fn(),
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
      ensurePayrollEntriesApproved as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('låser perioden og alle registreringer i samme transaktion', async () => {
    const period = {
      id: 12,
      cinemaId: 2,
      status: 'LOCKED',
    };
    const tx = {
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
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
        async (callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
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
    expect(tx.payrollPeriod.create).toHaveBeenCalledTimes(1);
    expect(tx.timeEntry.update).toHaveBeenCalledTimes(2);
    expect(tx.timeEntry.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: 41,
        },
        data: expect.objectContaining({
          payrollPeriodId: 12,
          payrollLocked: true,
          payrollTypeId: 5,
        }),
      }),
    );
    expect(tx.timeEntry.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          id: 42,
        },
        data: expect.objectContaining({
          payrollPeriodId: 12,
          payrollLocked: true,
          payrollTypeId: 6,
        }),
      }),
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
            new Error('Registreringen kunne ikke låses'),
          ),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
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
