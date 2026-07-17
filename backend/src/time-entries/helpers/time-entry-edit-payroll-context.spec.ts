import {
  getTimeEntryEditPayrollContext,
} from './time-entry-edit-payroll-context';
import {
  createEditAfterExportPayrollAdjustmentIfNeeded,
} from './time-entry-exported-payroll-adjustments';
import {
  createOrUpdateTimeEntryPayrollAdjustment,
} from './time-entry-payroll-adjustments';

jest.mock('./time-entry-payroll-adjustments', () => ({
  createOrUpdateTimeEntryPayrollAdjustment: jest.fn(),
}));

describe('time entry edit payroll context', () => {
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
  const baseEntry = {
    id: 44,
    cinemaId: 2,
    userId: 8,
    payrollPeriodId: null,
    originalPayrollPeriodId: null,
    isPayrollAdjustment: false,
    clockIn: new Date('2026-07-10T14:00:00.000Z'),
    clockOut: new Date('2026-07-10T22:00:00.000Z'),
  };
  const prisma = {
    payrollAdjustment: {
      findFirst: jest.fn(),
    },
    payrollPeriod: {
      findUnique: jest.fn(),
    },
  };
  const payrollService = {
    getCurrentPayrollPeriodEntity: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payrollAdjustment.findFirst.mockResolvedValue(null);
    prisma.payrollPeriod.findUnique.mockResolvedValue(
      exportedPeriod,
    );
    payrollService.getCurrentPayrollPeriodEntity.mockResolvedValue(
      currentPeriod,
    );
  });

  it('ignorerer en almindelig afventende post fra en gammel eksportperiode', async () => {
    const context = await getTimeEntryEditPayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: baseEntry,
    });

    expect(context).toBeNull();
    expect(prisma.payrollPeriod.findUnique).not.toHaveBeenCalled();
    expect(
      payrollService.getCurrentPayrollPeriodEntity,
    ).not.toHaveBeenCalled();
  });

  it('bruger den faktiske eksporterede løntilknytning', async () => {
    const context = await getTimeEntryEditPayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: {
        ...baseEntry,
        payrollPeriodId: 12,
      },
    });

    expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
      where: {
        id: 12,
      },
    });
    expect(context).toMatchObject({
      originalPayrollPeriod: exportedPeriod,
      adjustmentPayrollPeriod: currentPeriod,
      exportedMinutes: 480,
    });
  });

  it('bevarer eksportgrundlaget fra en afventende efterregulering', async () => {
    prisma.payrollAdjustment.findFirst.mockResolvedValue({
      status: 'PENDING',
      originalPayrollPeriodId: 12,
      settlementPayrollPeriodId: 13,
      exportedMinutes: 480,
      adjustedMinutes: 0,
    });

    const context = await getTimeEntryEditPayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: baseEntry,
    });

    expect(context).toMatchObject({
      originalPayrollPeriod: exportedPeriod,
      adjustmentPayrollPeriod: currentPeriod,
      exportedMinutes: 480,
    });
  });

  it('bruger senest eksporterede justerede minutter efter en inkluderet efterregulering', async () => {
    prisma.payrollAdjustment.findFirst.mockResolvedValue({
      status: 'INCLUDED',
      originalPayrollPeriodId: 12,
      settlementPayrollPeriodId: 13,
      exportedMinutes: 0,
      adjustedMinutes: 360,
    });
    prisma.payrollPeriod.findUnique.mockResolvedValue({
      ...exportedPeriod,
      id: 13,
    });

    const context = await getTimeEntryEditPayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: {
        ...baseEntry,
        isPayrollAdjustment: true,
        originalPayrollPeriodId: 12,
      },
    });

    expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
      where: {
        id: 13,
      },
    });
    expect(context?.exportedMinutes).toBe(360);
  });

  it('opretter ingen efterregulering for en almindelig afventende post', async () => {
    await createEditAfterExportPayrollAdjustmentIfNeeded({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: baseEntry,
      entry: {
        ...baseEntry,
        clockOut: new Date('2026-07-10T21:00:00.000Z'),
      },
      reason: 'Rettet tid',
      changedByUserId: 3,
    });

    expect(
      createOrUpdateTimeEntryPayrollAdjustment,
    ).not.toHaveBeenCalled();
  });

  it('opdaterer en eksisterende efterregulering med det korrekte eksportgrundlag', async () => {
    prisma.payrollAdjustment.findFirst.mockResolvedValue({
      status: 'PENDING',
      originalPayrollPeriodId: 12,
      settlementPayrollPeriodId: 13,
      exportedMinutes: 480,
      adjustedMinutes: 0,
    });
    const entry = {
      ...baseEntry,
      clockOut: new Date('2026-07-10T21:00:00.000Z'),
      user: {
        employmentType: 'HOURLY',
      },
    };

    await createEditAfterExportPayrollAdjustmentIfNeeded({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: baseEntry,
      entry,
      reason: 'Rettet tid',
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
        adjustedMinutes: 420,
        changedByUserId: 3,
      }),
    );
  });
});
