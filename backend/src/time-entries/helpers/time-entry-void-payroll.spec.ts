import { ConflictException } from '@nestjs/common';
import {
  createVoidPayrollAdjustmentIfNeeded,
  getVoidPayrollContext,
} from './time-entry-void-payroll';
import { createOrUpdateTimeEntryPayrollAdjustment } from './time-entry-payroll-adjustments';

jest.mock('./time-entry-payroll-adjustments', () => ({
  createOrUpdateTimeEntryPayrollAdjustment: jest.fn(),
}));

describe('time entry void payroll handling', () => {
  const exportedPeriod = {
    id: 12,
    status: 'EXPORTED',
    startDate: new Date('2026-06-21T00:00:00.000Z'),
    endDate: new Date('2026-07-20T23:59:59.999Z'),
  };
  const currentPeriod = {
    id: 13,
    status: 'OPEN',
    startDate: new Date('2026-07-21T00:00:00.000Z'),
    endDate: new Date('2026-08-20T23:59:59.999Z'),
  };
  const approvedEntry = {
    id: 44,
    cinemaId: 2,
    userId: 8,
    status: 'APPROVED',
    payrollPeriodId: 12,
    originalPayrollPeriodId: null,
    isPayrollAdjustment: false,
    clockIn: new Date('2026-07-10T14:00:00.000Z'),
    clockOut: new Date('2026-07-10T22:00:00.000Z'),
  };
  const prisma = {
    payrollPeriod: {
      findUnique: jest.fn(),
    },
  };
  const payrollService = {
    getPayrollPeriodEntityForDate: jest.fn(),
    getCurrentPayrollPeriodEntity: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payrollPeriod.findUnique.mockResolvedValue(exportedPeriod);
    payrollService.getCurrentPayrollPeriodEntity.mockResolvedValue(
      currentPeriod,
    );
  });

  it.each(['PENDING', 'NEEDS_CHANGES'])(
    'opretter ikke modregning for en %s registrering, der aldrig blev eksporteret',
    async (status) => {
      const context = await getVoidPayrollContext({
        prisma: prisma as never,
        payrollService: payrollService as never,
        existingEntry: {
          ...approvedEntry,
          status,
          payrollPeriodId: null,
        },
        confirmPayrollAdjustment: false,
      });

      expect(context.requiresPayrollAdjustment).toBe(false);
      expect(prisma.payrollPeriod.findUnique).not.toHaveBeenCalled();
      expect(
        payrollService.getPayrollPeriodEntityForDate,
      ).not.toHaveBeenCalled();
    },
  );

  it('kræver periodebekræftelse for en faktisk eksporteret registrering', async () => {
    await expect(
      getVoidPayrollContext({
        prisma: prisma as never,
        payrollService: payrollService as never,
        existingEntry: approvedEntry,
        confirmPayrollAdjustment: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      getVoidPayrollContext({
        prisma: prisma as never,
        payrollService: payrollService as never,
        existingEntry: approvedEntry,
        confirmPayrollAdjustment: false,
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'PAYROLL_PERIOD_EXPORTED',
        originalPayrollPeriod: {
          id: 12,
        },
        adjustmentPayrollPeriod: {
          id: 13,
        },
      },
    });
  });

  it('opretter negativ efterregulering for eksporterede timer', async () => {
    const payrollContext = await getVoidPayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: approvedEntry,
      confirmPayrollAdjustment: true,
    });
    const entry = {
      ...approvedEntry,
      status: 'VOIDED',
      user: {
        employmentType: 'HOURLY',
      },
    };

    await createVoidPayrollAdjustmentIfNeeded({
      prisma: prisma as never,
      existingEntry: approvedEntry,
      entry,
      payrollContext,
      reason: 'Dobbeltregistrering',
      changedByUserId: 3,
    });

    expect(
      createOrUpdateTimeEntryPayrollAdjustment,
    ).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        timeEntry: entry,
        originalPayrollPeriodId: 12,
        settlementPayrollPeriodId: 13,
        exportedMinutes: 480,
        adjustedMinutes: 0,
        changedByUserId: 3,
      }),
    );
  });

  it('ophæver en positiv efterregulering, der endnu ikke er eksporteret', async () => {
    const adjustedEntry = {
      ...approvedEntry,
      payrollPeriodId: null,
      originalPayrollPeriodId: 12,
      isPayrollAdjustment: true,
    };
    const payrollContext = await getVoidPayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: adjustedEntry,
      confirmPayrollAdjustment: true,
    });

    await createVoidPayrollAdjustmentIfNeeded({
      prisma: prisma as never,
      existingEntry: adjustedEntry,
      entry: {
        ...adjustedEntry,
        status: 'VOIDED',
        user: {
          employmentType: 'HOURLY',
        },
      },
      payrollContext,
      reason: 'Dobbeltregistrering',
      changedByUserId: 3,
    });

    expect(
      createOrUpdateTimeEntryPayrollAdjustment,
    ).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        exportedMinutes: 0,
        adjustedMinutes: 0,
      }),
    );
  });
});
