import { createOrUpdateTimeEntryPayrollAdjustment } from './time-entry-payroll-adjustments';
import { approveTimeEntryWithPayrollTransaction } from './time-entry-approve-payroll-transaction';

jest.mock('./time-entry-payroll-adjustments', () => ({
  createOrUpdateTimeEntryPayrollAdjustment:
    jest.fn(),
}));

describe('approve time entry payroll transaction', () => {
  const approvedEntry = {
    id: 41,
    cinemaId: 2,
    userId: 8,
    payrollTypeId: 5,
    clockIn: new Date(
      '2026-07-10T14:00:00.000Z',
    ),
    clockOut: new Date(
      '2026-07-10T22:00:00.000Z',
    ),
    user: {
      employmentType: 'HOURLY',
    },
  };

  function createPrisma() {
    const tx = {
      timeEntry: {
        update: jest
          .fn()
          .mockResolvedValue(approvedEntry),
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
      createOrUpdateTimeEntryPayrollAdjustment as jest.Mock
    ).mockResolvedValue({
      id: 91,
    });
  });

  it('godkender og opretter efterregulering i samme transaktion', async () => {
    const { prisma, tx } = createPrisma();

    await expect(
      approveTimeEntryWithPayrollTransaction({
        prisma: prisma as never,
        id: 41,
        approvalPayrollContext: {
          payrollPeriod: {
            id: 12,
            status: 'EXPORTED',
          },
          adjustmentPayrollPeriod: {
            id: 13,
          },
          adjustmentPayrollPeriodId: 13,
        },
        confirmPayrollAdjustment: true,
        changedByUserId: 7,
      }),
    ).resolves.toBe(approvedEntry);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 41,
        },
        data: expect.objectContaining({
          status: 'APPROVED',
          payrollPeriodId: null,
          isPayrollAdjustment: true,
          originalPayrollPeriodId: 12,
          adjustmentPayrollPeriodId: 13,
        }),
      }),
    );
    expect(
      createOrUpdateTimeEntryPayrollAdjustment,
    ).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        timeEntry: approvedEntry,
        originalPayrollPeriodId: 12,
        settlementPayrollPeriodId: 13,
        type: 'APPROVAL_AFTER_EXPORT',
        exportedMinutes: 0,
        adjustedMinutes: 480,
        changedByUserId: 7,
      }),
    );
  });

  it('opretter ingen efterregulering ved almindelig godkendelse', async () => {
    const { prisma } = createPrisma();

    await approveTimeEntryWithPayrollTransaction({
      prisma: prisma as never,
      id: 41,
      approvalPayrollContext: {
        payrollPeriod: {
          id: 12,
          status: 'OPEN',
        },
        adjustmentPayrollPeriod: null,
        adjustmentPayrollPeriodId: null,
      },
      confirmPayrollAdjustment: false,
      changedByUserId: 7,
    });

    expect(
      createOrUpdateTimeEntryPayrollAdjustment,
    ).not.toHaveBeenCalled();
  });

  it('afbryder handlingen, hvis efterreguleringen fejler', async () => {
    const { prisma } = createPrisma();
    (
      createOrUpdateTimeEntryPayrollAdjustment as jest.Mock
    ).mockRejectedValue(
      new Error(
        'Efterreguleringen kunne ikke gemmes',
      ),
    );

    await expect(
      approveTimeEntryWithPayrollTransaction({
        prisma: prisma as never,
        id: 41,
        approvalPayrollContext: {
          payrollPeriod: {
            id: 12,
            status: 'EXPORTED',
          },
          adjustmentPayrollPeriod: {
            id: 13,
          },
          adjustmentPayrollPeriodId: 13,
        },
        confirmPayrollAdjustment: true,
        changedByUserId: 7,
      }),
    ).rejects.toThrow(
      'Efterreguleringen kunne ikke gemmes',
    );
  });
});
