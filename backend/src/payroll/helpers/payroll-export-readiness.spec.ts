import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ensurePayrollExportLockUnchanged,
  getPayrollExportLockSnapshot,
} from './payroll-export-readiness';

describe('payroll export readiness', () => {
  const user = {
    sub: 7,
    role: 'ADMIN',
    cinemaId: 2,
    canManagePayroll: true,
  };
  const startDate = new Date('2026-07-21T00:00:00.000Z');
  const endDate = new Date('2026-08-20T23:59:59.999Z');
  const lockedAt = new Date('2026-08-21T08:00:00.000Z');
  const lockedPeriod = {
    id: 12,
    cinemaId: 2,
    status: 'LOCKED',
    startDate,
    endDate,
    lockedAt,
    lockedCalculationRunId: 44,
    lockedCalculationRun: { checksum: 'checksum-44' },
  };

  it('opretter et snapshot af den låste periode', async () => {
    const prisma = {
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(lockedPeriod),
      },
    };

    await expect(
      getPayrollExportLockSnapshot(
        prisma as never,
        user as never,
        '2026-07-21',
        '2026-08-20',
      ),
    ).resolves.toEqual({
      periodId: 12,
      cinemaId: 2,
      startDateTime: startDate.getTime(),
      endDateTime: endDate.getTime(),
      lockedAtTime: lockedAt.getTime(),
      lockedCalculationRunId: 44,
      calculationChecksum: 'checksum-44',
    });
  });

  it.each(['OPEN', 'UNLOCKED'])(
    'afviser fuld eksport fra status %s',
    async (status) => {
      const prisma = {
        payrollPeriod: {
          findFirst: jest.fn().mockResolvedValue({
            ...lockedPeriod,
            status,
          }),
        },
      };

      await expect(
        getPayrollExportLockSnapshot(
          prisma as never,
          user as never,
          '2026-07-21',
          '2026-08-20',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Lås lønperioden, før den eksporteres.',
        ),
      );
    },
  );

  it('tillader ny eksport af en allerede eksporteret periode', async () => {
    const prisma = {
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue({
          ...lockedPeriod,
          status: 'EXPORTED',
        }),
      },
    };

    await expect(
      getPayrollExportLockSnapshot(
        prisma as never,
        user as never,
        '2026-07-21',
        '2026-08-20',
      ),
    ).resolves.toEqual({
      periodId: 12,
      cinemaId: 2,
      startDateTime: startDate.getTime(),
      endDateTime: endDate.getTime(),
      lockedAtTime: lockedAt.getTime(),
      lockedCalculationRunId: 44,
      calculationChecksum: 'checksum-44',
    });
  });

  it('kræver samme låste snapshot ved et filtreret medarbejderudtræk', async () => {
    const prisma = {
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(lockedPeriod),
      },
    };

    await expect(
      getPayrollExportLockSnapshot(
        prisma as never,
        user as never,
        '2026-07-21',
        '2026-08-20',
        '18',
      ),
    ).resolves.toMatchObject({
      periodId: 12,
      lockedCalculationRunId: 44,
      calculationChecksum: 'checksum-44',
    });
    expect(prisma.payrollPeriod.findFirst).toHaveBeenCalledTimes(1);
  });

  it('accepterer samme lås ved finalisering', () => {
    expect(() =>
      ensurePayrollExportLockUnchanged(lockedPeriod, {
        periodId: 12,
        cinemaId: 2,
        startDateTime: startDate.getTime(),
        endDateTime: endDate.getTime(),
        lockedAtTime: lockedAt.getTime(),
        lockedCalculationRunId: 44,
        calculationChecksum: 'checksum-44',
      }),
    ).not.toThrow();
  });

  it('accepterer EXPORTED ved finalisering når det låste snapshot er uændret', () => {
    expect(() =>
      ensurePayrollExportLockUnchanged(
        {
          ...lockedPeriod,
          status: 'EXPORTED',
        },
        {
          periodId: 12,
          cinemaId: 2,
          startDateTime: startDate.getTime(),
          endDateTime: endDate.getTime(),
          lockedAtTime: lockedAt.getTime(),
          lockedCalculationRunId: 44,
          calculationChecksum: 'checksum-44',
        },
      ),
    ).not.toThrow();
  });

  it('afviser hvis perioden er genåbnet eller låst igen under filbygningen', () => {
    expect(() =>
      ensurePayrollExportLockUnchanged(
        {
          ...lockedPeriod,
          lockedAt: new Date('2026-08-21T09:00:00.000Z'),
        },
        {
          periodId: 12,
          cinemaId: 2,
          startDateTime: startDate.getTime(),
          endDateTime: endDate.getTime(),
          lockedAtTime: lockedAt.getTime(),
          lockedCalculationRunId: 44,
          calculationChecksum: 'checksum-44',
        },
      ),
    ).toThrow(ConflictException);
  });
});
