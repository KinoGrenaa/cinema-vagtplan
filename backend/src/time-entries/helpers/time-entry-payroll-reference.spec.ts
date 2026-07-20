import { getApprovalPayrollContext } from './time-entry-approval-helpers';
import { getUnapprovePayrollContext } from './time-entry-unapprove-payroll';
import { getVoidPayrollContext } from './time-entry-void-payroll';

describe('time entry payroll reference', () => {
  const shiftStart = new Date(
    '2026-07-20T21:30:00.000Z',
  );
  const clockIn = new Date(
    '2026-07-20T22:30:00.000Z',
  );
  const openPeriod = {
    id: 12,
    status: 'OPEN',
  };

  function createEntry(overrides: any = {}) {
    return {
      id: 41,
      cinemaId: 2,
      status: 'PENDING',
      payrollPeriodId: null,
      originalPayrollPeriodId: null,
      clockIn,
      shift: {
        id: 19,
        startTime: shiftStart,
      },
      ...overrides,
    };
  }

  function createPayrollService() {
    return {
      getPayrollPeriodEntityForDate: jest
        .fn()
        .mockResolvedValue(openPeriod),
      getCurrentPayrollPeriodEntity: jest.fn(),
    };
  }

  it('godkendelse bruger vagtens starttid som lønreference', async () => {
    const payrollService = createPayrollService();

    await getApprovalPayrollContext({
      payrollService: payrollService as never,
      existingEntry: createEntry(),
      confirmPayrollAdjustment: false,
    });

    expect(
      payrollService.getPayrollPeriodEntityForDate,
    ).toHaveBeenCalledWith(2, shiftStart);
  });

  it('godkendelse uden vagt bruger clockIn som lønreference', async () => {
    const payrollService = createPayrollService();

    await getApprovalPayrollContext({
      payrollService: payrollService as never,
      existingEntry: createEntry({
        shift: null,
      }),
      confirmPayrollAdjustment: false,
    });

    expect(
      payrollService.getPayrollPeriodEntityForDate,
    ).toHaveBeenCalledWith(2, clockIn);
  });

  it('fjern godkendelse bruger vagtens starttid ved fallback-opslag', async () => {
    const payrollService = createPayrollService();
    const prisma = {
      payrollPeriod: {
        findUnique: jest.fn(),
      },
    };

    await getUnapprovePayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: createEntry({
        status: 'APPROVED',
      }),
      confirmPayrollAdjustment: false,
    });

    expect(
      payrollService.getPayrollPeriodEntityForDate,
    ).toHaveBeenCalledWith(2, shiftStart);
    expect(
      prisma.payrollPeriod.findUnique,
    ).not.toHaveBeenCalled();
  });

  it('annullering bruger vagtens starttid ved fallback-opslag', async () => {
    const payrollService = createPayrollService();
    const prisma = {
      payrollPeriod: {
        findUnique: jest.fn(),
      },
    };

    await getVoidPayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: createEntry({
        status: 'APPROVED',
      }),
      confirmPayrollAdjustment: false,
    });

    expect(
      payrollService.getPayrollPeriodEntityForDate,
    ).toHaveBeenCalledWith(2, shiftStart);
    expect(
      prisma.payrollPeriod.findUnique,
    ).not.toHaveBeenCalled();
  });

  it('bevarer linket lønperiode frem for at genberegne', async () => {
    const payrollService = createPayrollService();
    const linkedPeriod = {
      id: 11,
      status: 'OPEN',
    };
    const prisma = {
      payrollPeriod: {
        findUnique: jest
          .fn()
          .mockResolvedValue(linkedPeriod),
      },
    };

    await getUnapprovePayrollContext({
      prisma: prisma as never,
      payrollService: payrollService as never,
      existingEntry: createEntry({
        status: 'APPROVED',
        payrollPeriodId: 11,
      }),
      confirmPayrollAdjustment: false,
    });

    expect(
      prisma.payrollPeriod.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 11,
      },
    });
    expect(
      payrollService.getPayrollPeriodEntityForDate,
    ).not.toHaveBeenCalled();
  });
});
