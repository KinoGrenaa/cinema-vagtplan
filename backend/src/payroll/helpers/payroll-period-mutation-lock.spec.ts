import {
  acquirePayrollPeriodMutationLockForDate,
  acquirePayrollPeriodMutationLockForPeriod,
  getPayrollPeriodAdvisoryLockKey,
} from './payroll-period-mutation-lock';

describe('payroll period mutation lock', () => {
  it('bruger en stabil låsenøgle for biograf og periodestart', () => {
    const start = new Date(
      '2026-07-21T00:00:00.000Z',
    );

    expect(
      getPayrollPeriodAdvisoryLockKey(2, start),
    ).toEqual({
      cinemaKey: 2,
      periodKey: Math.floor(
        start.getTime() / (24 * 60 * 60 * 1000),
      ),
    });
  });

  it('låser den samme 21.-20. periode ud fra dansk referencedato', async () => {
    const payrollPeriod = {
      id: 12,
      status: 'LOCKED',
    };
    const prisma = {
      cinema: {
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          payrollPeriodModel: 'FIXED_DAY_TO_DAY',
          payrollPeriodStartDay: 21,
          payrollPeriodEndDay: 20,
        }),
      },
      payrollPeriod: {
        findUnique: jest
          .fn()
          .mockResolvedValue(payrollPeriod),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        {
          pg_advisory_xact_lock: null,
        },
      ]),
    };

    const result =
      await acquirePayrollPeriodMutationLockForDate(
        prisma as never,
        {
          cinemaId: 2,
          referenceDate: new Date(
            '2026-07-20T22:30:00.000Z',
          ),
        },
      );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(
      prisma.payrollPeriod.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId_startDate_endDate: {
          cinemaId: 2,
          startDate: new Date(
            '2026-07-21T00:00:00.000Z',
          ),
          endDate: new Date(
            '2026-08-20T23:59:59.999Z',
          ),
        },
      },
    });
    expect(result).toMatchObject({
      payrollPeriod,
      startDate: '2026-07-21',
      endDate: '2026-08-20',
    });
  });

  it('låser en eksplicit periode med samme periodestart', async () => {
    const prisma = {
      cinema: {
        findUnique: jest.fn(),
      },
      payrollPeriod: {
        findUnique: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        {
          pg_advisory_xact_lock: null,
        },
      ]),
    };

    await expect(
      acquirePayrollPeriodMutationLockForPeriod(
        prisma as never,
        {
          cinemaId: 2,
          startDate: '2026-07-21',
          endDate: '2026-08-20',
        },
      ),
    ).resolves.toEqual({
      start: new Date(
        '2026-07-21T00:00:00.000Z',
      ),
      end: new Date(
        '2026-08-20T23:59:59.999Z',
      ),
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
