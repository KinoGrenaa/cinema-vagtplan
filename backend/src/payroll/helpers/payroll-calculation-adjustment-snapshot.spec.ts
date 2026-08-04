import { createPayrollCalculationRun } from './payroll-calculation';

describe('payroll calculation adjustment snapshot', () => {
  it('fryser inkluderede efterreguleringer som beregningslinjer og i kontrollen', async () => {
    const run = { id: 81 };
    const prisma = {
      timeEntry: { findMany: jest.fn().mockResolvedValue([]) },
      cinemaPayrollConfigurationVersion: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 3,
            mode: 'HOURS_ONLY',
            validFrom: new Date('2020-01-01T00:00:00.000Z'),
            validTo: null,
          },
        ]),
      },
      payRule: { findMany: jest.fn().mockResolvedValue([]) },
      cinemaSpecialDay: { findMany: jest.fn().mockResolvedValue([]) },
      payrollAdjustment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 44,
            cinemaId: 2,
            userId: 7,
            timeEntryId: 19,
            originalPayrollPeriodId: 10,
            payrollTypeId: 5,
            type: 'PAY_RATE_CHANGE',
            exportCategory: 'HOURLY',
            minutesDelta: 0,
            amountDelta: '50.00',
            currencyCode: 'DKK',
            sourcePayRateVersionId: 4,
            sourcePayRuleVersionId: null,
            reason: 'Retroaktiv sats',
            user: { cinemaMemberships: [{ id: 17 }] },
            timeEntry: {
              clockIn: new Date('2026-06-01T08:00:00.000Z'),
              clockOut: new Date('2026-06-01T16:00:00.000Z'),
              payrollTypeId: 5,
              shift: { jobFunctionId: 9, jobFunction: null },
            },
          },
        ]),
      },
      payrollCalculationRun: {
        create: jest.fn().mockResolvedValue(run),
        findUnique: jest.fn().mockResolvedValue({ ...run, lines: [] }),
      },
      payrollCalculationLine: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await createPayrollCalculationRun(prisma, {
      cinemaId: 2,
      payrollPeriodId: 12,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      createdByUserId: 7,
      status: 'LOCKED',
    });

    expect(prisma.payrollAdjustment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          cinemaId: 2,
          settlementPayrollPeriodId: 12,
          status: 'INCLUDED',
        },
      }),
    );
    expect(prisma.payrollCalculationRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalAmount: '50.00',
        checksum: expect.any(String),
      }),
    });
    expect(prisma.payrollCalculationLine.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          payrollAdjustmentId: 44,
          membershipId: 17,
          lineType: 'ADJUSTMENT',
          roundedAmount: '50.00',
        }),
      ],
    });
  });
});
