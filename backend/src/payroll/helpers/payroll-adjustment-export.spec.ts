import { includePendingPayrollAdjustmentsInPeriod } from './payroll-adjustment-export';
import { buildPayrollReportData } from './payroll-report-data';

describe('payroll adjustment export', () => {
  const periodStart = new Date('2026-07-21T00:00:00.000Z');
  const includedAt = new Date('2026-07-20T22:15:00.000Z');

  it('markerer både tildelte og utildelte PENDING efterreguleringer som INCLUDED', async () => {
    const pendingAdjustment = {
      id: 41,
      status: 'PENDING',
      settlementPayrollPeriodId: null,
      exportedMinutes: 480,
      adjustedMinutes: 420,
      minutesDelta: -60,
      originalPayrollPeriodId: 11,
    };
    const includedAdjustment = {
      ...pendingAdjustment,
      status: 'INCLUDED',
      settlementPayrollPeriodId: 12,
      includedAt,
    };
    const prisma = {
      payrollAdjustment: {
        findMany: jest
          .fn()
          .mockResolvedValue([pendingAdjustment]),
        update: jest
          .fn()
          .mockResolvedValue(includedAdjustment),
      },
      payrollAdjustmentRevision: {
        create: jest.fn().mockResolvedValue({
          id: 1,
        }),
      },
    };

    const count =
      await includePendingPayrollAdjustmentsInPeriod(
        prisma as never,
        {
          cinemaId: 2,
          payrollPeriodId: 12,
          periodStart,
          includedAt,
          changedByUserId: 7,
        },
      );

    expect(prisma.payrollAdjustment.findMany).toHaveBeenCalledWith({
      where: {
        cinemaId: 2,
        status: 'PENDING',
        OR: [
          {
            settlementPayrollPeriodId: 12,
          },
          {
            settlementPayrollPeriodId: null,
            originalPayrollPeriod: {
              endDate: {
                lt: periodStart,
              },
            },
          },
        ],
      },
    });
    expect(prisma.payrollAdjustment.update).toHaveBeenCalledWith({
      where: {
        id: 41,
      },
      data: {
        status: 'INCLUDED',
        settlementPayrollPeriodId: 12,
        includedAt,
        voidedAt: null,
      },
    });
    expect(
      prisma.payrollAdjustmentRevision.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        payrollAdjustmentId: 41,
        changedByUserId: 7,
        action: 'INCLUDED',
        previousStatus: 'PENDING',
        newStatus: 'INCLUDED',
        previousSettlementPayrollPeriodId: null,
        newSettlementPayrollPeriodId: 12,
        reason: 'Medtaget i låst lønperiode.',
      }),
    });
    expect(count).toBe(1);
  });

  it('medtager PENDING og INCLUDED efterreguleringer for den valgte periode i rapporten', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest
          .fn()
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0),
      },
      payrollAdjustment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      cinemaPayrollConfigurationVersion: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            mode: 'HOURS_ONLY',
            validFrom: new Date('2020-01-01T00:00:00.000Z'),
            validTo: null,
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({ mode: 'HOURS_ONLY' }),
      },
      payRule: { findMany: jest.fn().mockResolvedValue([]) },
      cinemaSpecialDay: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const user = {
      sub: 7,
      role: 'ADMIN',
      cinemaId: 2,
      canManagePayroll: true,
    };

    await buildPayrollReportData(
      prisma as never,
      user as never,
      '2026-07-21',
      '2026-08-20',
    );

    expect(
      prisma.payrollAdjustment.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cinemaId: 2,
          OR: [
            {
              status: 'PENDING',
              settlementPayrollPeriodId: null,
              originalPayrollPeriod: {
                endDate: {
                  lt: expect.any(Date),
                },
              },
            },
            {
              status: {
                in: ['PENDING', 'INCLUDED'],
              },
              settlementPayrollPeriod: {
                startDate: expect.any(Date),
                endDate: expect.any(Date),
              },
            },
          ],
        }),
      }),
    );
  });

  it('gør ingenting, når der ikke er efterreguleringer i eksporten', async () => {
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
      await includePendingPayrollAdjustmentsInPeriod(
        prisma as never,
        {
          cinemaId: 2,
          payrollPeriodId: 12,
          periodStart,
          includedAt,
          changedByUserId: 7,
        },
      );

    expect(prisma.payrollAdjustment.update).not.toHaveBeenCalled();
    expect(
      prisma.payrollAdjustmentRevision.create,
    ).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });
});
