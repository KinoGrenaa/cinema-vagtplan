import { markPayrollPeriodAsExported } from './payroll-period-export';

describe('payroll period repeated export', () => {
  const user = {
    sub: 7,
    role: 'ADMIN',
    cinemaId: 2,
    canManagePayroll: true,
  };

  const startDate = new Date('2026-07-21T00:00:00.000Z');
  const endDate = new Date('2026-08-20T23:59:59.999Z');
  const lockedAt = new Date('2026-08-19T08:38:12.801Z');
  const unlockedAt = new Date('2026-08-19T06:04:00.000Z');

  const lockSnapshot = {
    periodId: 12,
    cinemaId: 2,
    startDateTime: startDate.getTime(),
    endDateTime: endDate.getTime(),
    lockedAtTime: lockedAt.getTime(),
    lockedCalculationRunId: 44,
    calculationChecksum: 'checksum-44',
  };

  function createPeriod(status: 'LOCKED' | 'EXPORTED') {
    return {
      id: 12,
      cinemaId: 2,
      status,
      startDate,
      endDate,
      lockedAt,
      lockedCalculationRunId: 44,
      lockedCalculationRun: {
        checksum: 'checksum-44',
      },
      exportedAt:
        status === 'EXPORTED'
          ? new Date('2026-08-19T08:39:09.858Z')
          : null,
      exportedByUserId:
        status === 'EXPORTED' ? 7 : null,
      unlockedAt,
      unlockedByUserId: 7,
      unlockNote: 'Test: genåbnet før eksport',
    };
  }

  function createPrisma(
    period: ReturnType<typeof createPeriod>,
  ) {
    const tx = {
      payrollPeriod: {
        findUnique: jest.fn().mockResolvedValue(period),
        update: jest.fn().mockImplementation(
          async ({ data }) => ({
            ...period,
            ...data,
          }),
        ),
      },
    };

    return {
      tx,
      prisma: {
        $transaction: jest.fn(
          async (
            callback: (
              transaction: typeof tx,
            ) => Promise<unknown>,
          ) => callback(tx),
        ),
      },
    };
  }

  it('første eksport bevarer genåbningsaudit', async () => {
    const { prisma, tx } =
      createPrisma(createPeriod('LOCKED'));

    await markPayrollPeriodAsExported(
      prisma as never,
      user as never,
      '2026-07-21',
      '2026-08-20',
      undefined,
      undefined,
      lockSnapshot,
    );

    expect(
      tx.payrollPeriod.update,
    ).toHaveBeenCalledTimes(1);

    const data =
      tx.payrollPeriod.update.mock.calls[0][0].data;

    expect(data).toEqual(
      expect.objectContaining({
        status: 'EXPORTED',
        exportedAt: expect.any(Date),
        exportedByUserId: 7,
      }),
    );
    expect(data).not.toHaveProperty('unlockedAt');
    expect(data).not.toHaveProperty('unlockedByUserId');
    expect(data).not.toHaveProperty('unlockNote');
  });

  it('gentagen eksport ændrer ikke perioden eller første eksporttid', async () => {
    const exportedPeriod =
      createPeriod('EXPORTED');
    const { prisma, tx } =
      createPrisma(exportedPeriod);

    await expect(
      markPayrollPeriodAsExported(
        prisma as never,
        user as never,
        '2026-07-21',
        '2026-08-20',
        undefined,
        undefined,
        lockSnapshot,
      ),
    ).resolves.toBe(exportedPeriod);

    expect(
      tx.payrollPeriod.update,
    ).not.toHaveBeenCalled();
    expect(exportedPeriod.exportedAt).toEqual(
      new Date('2026-08-19T08:39:09.858Z'),
    );
    expect(exportedPeriod.unlockedAt).toBe(
      unlockedAt,
    );
    expect(exportedPeriod.unlockNote).toBe(
      'Test: genåbnet før eksport',
    );
  });
});
