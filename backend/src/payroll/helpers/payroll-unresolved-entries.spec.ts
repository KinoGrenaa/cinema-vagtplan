import { BadRequestException } from '@nestjs/common';
import { ensurePayrollEntriesApproved } from './payroll-period-export';
import { lockPayrollPeriod } from './payroll-period-lock-flow';
import { buildPayrollReportData } from './payroll-report-data';

describe('payroll unresolved time entries', () => {
  const user = {
    sub: 4,
    role: 'ADMIN',
    cinemaId: 2,
    canManagePayroll: true,
  };

  function createUnresolvedEntries() {
    return [
      {
        status: 'PENDING',
        clockOut: null,
        user: {
          firstName: 'Anna',
          lastName: 'Andersen',
        },
      },
      {
        status: 'PENDING',
        clockOut: new Date(
          '2026-07-10T20:00:00.000Z',
        ),
        user: {
          firstName: 'Bent',
          lastName: 'Bentsen',
        },
      },
      {
        status: 'NEEDS_CHANGES',
        clockOut: new Date(
          '2026-07-11T20:00:00.000Z',
        ),
        user: {
          firstName: 'Clara',
          lastName: 'Christensen',
        },
      },
    ];
  }

  it('blokerer eksport ved åbne, PENDING og NEEDS_CHANGES registreringer', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            createUnresolvedEntries(),
          ),
      },
    };

    await expect(
      ensurePayrollEntriesApproved(
        prisma as never,
        user as never,
        '2026-06-21',
        '2026-07-20',
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const where =
      prisma.timeEntry.findMany.mock.calls[0][0]
        .where;

    expect(where).toEqual(
      expect.objectContaining({
        cinemaId: 2,
        status: {
          in: [
            'PENDING',
            'NEEDS_CHANGES',
          ],
        },
      }),
    );
    expect(where.clockOut).toBeUndefined();

    await expect(
      ensurePayrollEntriesApproved(
        prisma as never,
        user as never,
        '2026-06-21',
        '2026-07-20',
      ),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining(
          'stadig er åbne, afventer godkendelse eller er sendt retur til rettelse',
        ),
      },
    });
  });

  it('blokerer låsning før periodens registreringer ændres', async () => {
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([]),
      timeEntry: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            createUnresolvedEntries(),
          ),
      },
      payrollPeriod: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      payrollType: {
        findFirst: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (
            tx: typeof transaction,
          ) => unknown,
        ) => callback(transaction),
      ),
    };

    await expect(
      lockPayrollPeriod(
        prisma as never,
        user as never,
        '2026-06-21',
        '2026-07-20',
      ),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining(
          'Kan ikke låse lønperioden',
        ),
      },
    });

    expect(
      prisma.$transaction,
    ).toHaveBeenCalledTimes(1);
    expect(
      transaction.$queryRaw,
    ).toHaveBeenCalledTimes(1);
    expect(
      transaction.payrollPeriod.findFirst,
    ).not.toHaveBeenCalled();
    expect(
      transaction.payrollPeriod.update,
    ).not.toHaveBeenCalled();
    expect(
      transaction.payrollPeriod.create,
    ).not.toHaveBeenCalled();
  });

  it('tæller åbne og øvrige uløste statuser i payrollrapporten', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
        count: jest
          .fn()
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(0),
      },
      payrollAdjustment: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
      },
    };

    const result =
      await buildPayrollReportData(
        prisma as never,
        user as never,
        '2026-06-21',
        '2026-07-20',
      );

    const unresolvedWhere =
      prisma.timeEntry.count.mock.calls[0][0]
        .where;

    expect(unresolvedWhere).toEqual(
      expect.objectContaining({
        cinemaId: 2,
        status: {
          in: [
            'PENDING',
            'NEEDS_CHANGES',
          ],
        },
      }),
    );
    expect(
      unresolvedWhere.clockOut,
    ).toBeUndefined();
    expect(result.pendingCount).toBe(3);
  });
});
