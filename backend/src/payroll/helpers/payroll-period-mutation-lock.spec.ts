import {
  acquirePayrollPeriodMutationLockForDate,
  acquirePayrollPeriodMutationLockForPeriod,
  acquirePayrollPeriodMutationLocksForDates,
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

  it('låser flere perioder i stigende rækkefølge og genbruger samme lås', async () => {
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
          .mockResolvedValueOnce({
            id: 11,
            status: 'OPEN',
          })
          .mockResolvedValueOnce({
            id: 12,
            status: 'LOCKED',
          }),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        {
          pg_advisory_xact_lock: null,
        },
      ]),
    };
    const laterReference = new Date(
      '2026-08-05T12:00:00.000Z',
    );
    const earlierReference = new Date(
      '2026-07-05T12:00:00.000Z',
    );

    const result =
      await acquirePayrollPeriodMutationLocksForDates(
        prisma as never,
        {
          cinemaId: 2,
          referenceDates: [
            laterReference,
            earlierReference,
            laterReference,
          ],
        },
      );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(
      prisma.payrollPeriod.findUnique,
    ).toHaveBeenCalledTimes(2);

    const firstSql =
      prisma.$queryRaw.mock.calls[0][0];
    const secondSql =
      prisma.$queryRaw.mock.calls[1][0];

    expect(firstSql.values[1]).toBe(
      getPayrollPeriodAdvisoryLockKey(
        2,
        new Date('2026-06-21T00:00:00.000Z'),
      ).periodKey,
    );
    expect(secondSql.values[1]).toBe(
      getPayrollPeriodAdvisoryLockKey(
        2,
        new Date('2026-07-21T00:00:00.000Z'),
      ).periodKey,
    );

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      referenceDate: laterReference,
      startDate: '2026-07-21',
      endDate: '2026-08-20',
      payrollPeriod: {
        id: 12,
        status: 'LOCKED',
      },
    });
    expect(result[1]).toMatchObject({
      referenceDate: earlierReference,
      startDate: '2026-06-21',
      endDate: '2026-07-20',
      payrollPeriod: {
        id: 11,
        status: 'OPEN',
      },
    });
    expect(result[2]).toMatchObject({
      referenceDate: laterReference,
      startDate: '2026-07-21',
      endDate: '2026-08-20',
      payrollPeriod: {
        id: 12,
        status: 'LOCKED',
      },
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
