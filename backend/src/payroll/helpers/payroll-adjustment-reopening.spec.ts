import { reopenIncludedPayrollAdjustmentsForPeriod } from './payroll-adjustment-reopening';

describe('payroll adjustment reopening', () => {
  const includedAdjustment = {
    id: 41,
    status: 'INCLUDED',
    settlementPayrollPeriodId: 12,
    exportedMinutes: 480,
    adjustedMinutes: 420,
    minutesDelta: -60,
    originalPayrollPeriodId: 11,
    includedAt: new Date('2026-08-20T12:00:00.000Z'),
    voidedAt: null,
  };

  it('sætter inkluderede efterreguleringer tilbage til PENDING', async () => {
    const reopenedAdjustment = {
      ...includedAdjustment,
      status: 'PENDING',
      includedAt: null,
    };
    const prisma = {
      payrollAdjustment: {
        findMany: jest
          .fn()
          .mockResolvedValue([includedAdjustment]),
        update: jest
          .fn()
          .mockResolvedValue(reopenedAdjustment),
      },
      payrollAdjustmentRevision: {
        create: jest.fn().mockResolvedValue({
          id: 1,
        }),
      },
    };

    const count =
      await reopenIncludedPayrollAdjustmentsForPeriod(
        prisma as never,
        {
          cinemaId: 2,
          payrollPeriodId: 12,
          changedByUserId: 7,
          note: 'Rettelse efter kontrol',
        },
      );

    expect(prisma.payrollAdjustment.findMany).toHaveBeenCalledWith({
      where: {
        cinemaId: 2,
        settlementPayrollPeriodId: 12,
        status: 'INCLUDED',
      },
    });
    expect(prisma.payrollAdjustment.update).toHaveBeenCalledWith({
      where: {
        id: 41,
      },
      data: {
        status: 'PENDING',
        includedAt: null,
        voidedAt: null,
      },
    });
    expect(
      prisma.payrollAdjustmentRevision.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        payrollAdjustmentId: 41,
        changedByUserId: 7,
        action: 'UPDATED',
        previousStatus: 'INCLUDED',
        newStatus: 'PENDING',
        previousSettlementPayrollPeriodId: 12,
        newSettlementPayrollPeriodId: 12,
        reason:
          'Lønperioden blev genåbnet. Rettelse efter kontrol',
      }),
    });
    expect(count).toBe(1);
  });

  it('gør ingenting, når perioden ikke har inkluderede efterreguleringer', async () => {
    const prisma = {
      payrollAdjustment: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      payrollAdjustmentRevision: {
        create: jest.fn(),
      },
    };

    const count =
      await reopenIncludedPayrollAdjustmentsForPeriod(
        prisma as never,
        {
          cinemaId: 2,
          payrollPeriodId: 12,
          changedByUserId: 7,
          note: 'Rettelse efter kontrol',
        },
      );

    expect(prisma.payrollAdjustment.update).not.toHaveBeenCalled();
    expect(
      prisma.payrollAdjustmentRevision.create,
    ).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });
});
