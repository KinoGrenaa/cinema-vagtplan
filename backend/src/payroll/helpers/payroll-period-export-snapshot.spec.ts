import { markPayrollPeriodAsExported } from './payroll-period-export';

describe('payroll export snapshot finalization', () => {
  it('ændrer kun periodestatus og tilknytter ikke nye live-data efter låsning', async () => {
    const period = {
      id: 12,
      status: 'LOCKED',
      cinemaId: 2,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-31T00:00:00.000Z'),
      lockedAt: new Date('2026-08-01T08:00:00.000Z'),
      lockedCalculationRunId: 91,
      lockedCalculationRun: { checksum: 'locked-checksum' },
    };
    const exported = { ...period, status: 'EXPORTED' };
    const tx = {
      payrollPeriod: {
        findUnique: jest.fn().mockResolvedValue(period),
        update: jest.fn().mockResolvedValue(exported),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (value: typeof tx) => unknown) => callback(tx)),
    };

    await expect(
      markPayrollPeriodAsExported(
        prisma as never,
        {
          sub: 7,
          role: 'ADMIN',
          cinemaId: 2,
          canManagePayroll: true,
        } as never,
        '2026-07-01',
        '2026-07-31',
        undefined,
        undefined,
        {
          periodId: 12,
          cinemaId: 2,
          startDateTime: period.startDate.getTime(),
          endDateTime: period.endDate.getTime(),
          lockedAtTime: period.lockedAt.getTime(),
          lockedCalculationRunId: 91,
          calculationChecksum: 'locked-checksum',
        },
      ),
    ).resolves.toBe(exported);

    expect(tx.payrollPeriod.update).toHaveBeenCalledTimes(1);
    expect(Object.keys(tx)).toEqual(['payrollPeriod']);
  });
});
