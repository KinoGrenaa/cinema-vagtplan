import { ConflictException } from '@nestjs/common';
import {
  createUnapprovePayrollAdjustmentIfNeeded,
  getUnapprovePayrollContext,
  getUnapproveTimeEntryUpdateData,
} from './time-entry-unapprove-payroll';
import { createOrUpdateTimeEntryPayrollAdjustment } from './time-entry-payroll-adjustments';

jest.mock('./time-entry-payroll-adjustments', () => ({
  createOrUpdateTimeEntryPayrollAdjustment: jest.fn(),
}));

describe('time entry unapprove payroll handling', () => {
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
  const existingEntry = {
    id: 44,
    cinemaId: 2,
    userId: 8,
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

  it('kræver ekstra bekræftelse ved fjernelse efter eksport', async () => {
    await expect(
      getUnapprovePayrollContext({
        prisma: prisma as never,
        payrollService: payrollService as never,
        existingEntry,
        confirmPayrollAdjustment: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      getUnapprovePayrollContext({
        prisma: prisma as never,
        payrollService: payrollService as never,
        existingEntry,
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

  it('opretter en negativ efterregulering for eksporterede timer', async () => {
    const payrollContext = await getUnapprovePayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry,
      confirmPayrollAdjustment: true,
    });
    const entry = {
      ...existingEntry,
      status: 'PENDING',
      payrollPeriodId: null,
      user: {
        employmentType: 'HOURLY',
      },
    };

    await createUnapprovePayrollAdjustmentIfNeeded({
      prisma: prisma as never,
      existingEntry,
      entry,
      payrollContext,
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
        type: 'EDIT_AFTER_EXPORT',
        exportedMinutes: 480,
        adjustedMinutes: 0,
        changedByUserId: 3,
      }),
    );
    expect(getUnapproveTimeEntryUpdateData(payrollContext)).toEqual({
      status: 'PENDING',
      payrollPeriodId: null,
      isPayrollAdjustment: false,
      originalPayrollPeriodId: null,
      adjustmentPayrollPeriodId: null,
      payrollAdjustmentReason: null,
    });
  });

  it('ophæver en endnu ikke eksporteret positiv efterregulering', async () => {
    const adjustedEntry = {
      ...existingEntry,
      payrollPeriodId: null,
      originalPayrollPeriodId: 12,
      isPayrollAdjustment: true,
    };
    const payrollContext = await getUnapprovePayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: adjustedEntry,
      confirmPayrollAdjustment: true,
    });

    await createUnapprovePayrollAdjustmentIfNeeded({
      prisma: prisma as never,
      existingEntry: adjustedEntry,
      entry: {
        ...adjustedEntry,
        status: 'PENDING',
        user: {
          employmentType: 'HOURLY',
        },
      },
      payrollContext,
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

  it('ændrer kun status, når perioden ikke er eksporteret', async () => {
    prisma.payrollPeriod.findUnique.mockResolvedValue({
      ...exportedPeriod,
      status: 'OPEN',
    });

    const payrollContext = await getUnapprovePayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry,
      confirmPayrollAdjustment: false,
    });

    expect(getUnapproveTimeEntryUpdateData(payrollContext)).toEqual({
      status: 'PENDING',
    });
    expect(
      createOrUpdateTimeEntryPayrollAdjustment,
    ).not.toHaveBeenCalled();
  });
});
