import {
  createUnapprovePayrollAdjustmentIfNeeded,
} from './time-entry-unapprove-payroll';
import {
  createVoidPayrollAdjustmentIfNeeded,
} from './time-entry-void-payroll';
import {
  unapproveTimeEntryWithPayrollTransaction,
  voidTimeEntryWithPayrollTransaction,
} from './time-entry-status-payroll-transaction';

jest.mock('./time-entry-unapprove-payroll', () => ({
  getUnapproveTimeEntryUpdateData: jest.fn(
    (context) =>
      context.requiresPayrollAdjustment
        ? {
            status: 'PENDING',
            payrollPeriodId: null,
            isPayrollAdjustment: false,
            originalPayrollPeriodId: null,
            adjustmentPayrollPeriodId: null,
            payrollAdjustmentReason: null,
          }
        : {
            status: 'PENDING',
          },
  ),
  createUnapprovePayrollAdjustmentIfNeeded:
    jest.fn(),
}));

jest.mock('./time-entry-void-payroll', () => ({
  createVoidPayrollAdjustmentIfNeeded:
    jest.fn(),
}));

describe('time entry status payroll transactions', () => {
  const existingEntry = {
    id: 41,
    cinemaId: 2,
    userId: 8,
    status: 'APPROVED',
    clockIn: new Date(
      '2026-07-10T14:00:00.000Z',
    ),
    clockOut: new Date(
      '2026-07-10T22:00:00.000Z',
    ),
  };
  const updatedEntry = {
    ...existingEntry,
    status: 'PENDING',
  };

  function createPrisma() {
    const tx = {
      timeEntry: {
        update: jest
          .fn()
          .mockResolvedValue(updatedEntry),
      },
      payrollAdjustment: {},
      payrollAdjustmentRevision: {},
    };

    return {
      tx,
      prisma: {
        $transaction: jest.fn(
          async (
            callback: (
              transaction: typeof tx,
            ) => unknown,
          ) => callback(tx),
        ),
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (
      createUnapprovePayrollAdjustmentIfNeeded as jest.Mock
    ).mockResolvedValue({
      id: 91,
    });
    (
      createVoidPayrollAdjustmentIfNeeded as jest.Mock
    ).mockResolvedValue({
      id: 92,
    });
  });

  it('fjerner godkendelse og opretter efterregulering i samme transaktion', async () => {
    const { prisma, tx } = createPrisma();
    const payrollContext = {
      originalPayrollPeriod: {
        id: 12,
      },
      adjustmentPayrollPeriod: {
        id: 13,
      },
      requiresPayrollAdjustment: true,
    };

    await expect(
      unapproveTimeEntryWithPayrollTransaction({
        prisma: prisma as never,
        id: 41,
        existingEntry,
        payrollContext,
        changedByUserId: 7,
      }),
    ).resolves.toBe(updatedEntry);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 41,
        },
        data: expect.objectContaining({
          status: 'PENDING',
          payrollPeriodId: null,
        }),
      }),
    );
    expect(
      createUnapprovePayrollAdjustmentIfNeeded,
    ).toHaveBeenCalledWith({
      prisma: tx,
      existingEntry,
      entry: updatedEntry,
      payrollContext,
      changedByUserId: 7,
    });
  });

  it('ruller fjern godkendelse tilbage, hvis efterreguleringen fejler', async () => {
    const { prisma } = createPrisma();
    (
      createUnapprovePayrollAdjustmentIfNeeded as jest.Mock
    ).mockRejectedValue(
      new Error(
        'Efterreguleringen kunne ikke gemmes',
      ),
    );

    await expect(
      unapproveTimeEntryWithPayrollTransaction({
        prisma: prisma as never,
        id: 41,
        existingEntry,
        payrollContext: {
          originalPayrollPeriod: {
            id: 12,
          },
          adjustmentPayrollPeriod: {
            id: 13,
          },
          requiresPayrollAdjustment: true,
        },
        changedByUserId: 7,
      }),
    ).rejects.toThrow(
      'Efterreguleringen kunne ikke gemmes',
    );
  });

  it('annullerer og opretter efterregulering i samme transaktion', async () => {
    const { prisma, tx } = createPrisma();
    const voidedEntry = {
      ...existingEntry,
      status: 'VOIDED',
      adminNote: 'Fejlregistrering',
    };
    tx.timeEntry.update.mockResolvedValue(
      voidedEntry,
    );
    const payrollContext = {
      originalPayrollPeriod: {
        id: 12,
      },
      adjustmentPayrollPeriod: {
        id: 13,
      },
      requiresPayrollAdjustment: true,
    };

    await expect(
      voidTimeEntryWithPayrollTransaction({
        prisma: prisma as never,
        id: 41,
        existingEntry,
        payrollContext,
        reason: 'Fejlregistrering',
        changedByUserId: 7,
      }),
    ).resolves.toBe(voidedEntry);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 41,
        },
        data: {
          status: 'VOIDED',
          adminNote: 'Fejlregistrering',
        },
      }),
    );
    expect(
      createVoidPayrollAdjustmentIfNeeded,
    ).toHaveBeenCalledWith({
      prisma: tx,
      existingEntry,
      entry: voidedEntry,
      payrollContext,
      reason: 'Fejlregistrering',
      changedByUserId: 7,
    });
  });

  it('ruller annullering tilbage, hvis efterreguleringen fejler', async () => {
    const { prisma } = createPrisma();
    (
      createVoidPayrollAdjustmentIfNeeded as jest.Mock
    ).mockRejectedValue(
      new Error(
        'Efterreguleringen kunne ikke gemmes',
      ),
    );

    await expect(
      voidTimeEntryWithPayrollTransaction({
        prisma: prisma as never,
        id: 41,
        existingEntry,
        payrollContext: {
          originalPayrollPeriod: {
            id: 12,
          },
          adjustmentPayrollPeriod: {
            id: 13,
          },
          requiresPayrollAdjustment: true,
        },
        reason: 'Fejlregistrering',
        changedByUserId: 7,
      }),
    ).rejects.toThrow(
      'Efterreguleringen kunne ikke gemmes',
    );
  });
});
