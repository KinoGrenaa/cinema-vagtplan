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

  it('afviser en allerede eksporteret periode', async () => {
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
    ).rejects.toThrow(
      'Lønperioden er allerede eksporteret',
    );
  });

  it('bevarer individuelle medarbejderudtræk uden periodelås', async () => {
    const prisma = {
      payrollPeriod: {
        findFirst: jest.fn(),
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
    ).resolves.toBeNull();
    expect(prisma.payrollPeriod.findFirst).not.toHaveBeenCalled();
  });

  it('accepterer samme lås ved finalisering', () => {
    expect(() =>
      ensurePayrollExportLockUnchanged(lockedPeriod, {
        periodId: 12,
        cinemaId: 2,
        startDateTime: startDate.getTime(),
        endDateTime: endDate.getTime(),
        lockedAtTime: lockedAt.getTime(),
      }),
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
        },
      ),
    ).toThrow(ConflictException);
  });
});
