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
        user: {
          firstName: 'Anna',
          lastName: 'Andersen',
        },
      },
      {
        status: 'NEEDS_CHANGES',
        user: {
          firstName: 'Bent',
          lastName: 'Bentsen',
        },
      },
    ];
  }

  it('blokerer eksport ved PENDING og NEEDS_CHANGES', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest.fn().mockResolvedValue(
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
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cinemaId: 2,
          status: {
            in: ['PENDING', 'NEEDS_CHANGES'],
          },
        }),
      }),
    );

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
          'Kan ikke eksportere',
        ),
      },
    });
  });

  it('blokerer låsning før periodens registreringer ændres', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest.fn().mockResolvedValue(
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

    expect(prisma.payrollPeriod.findFirst).not.toHaveBeenCalled();
    expect(prisma.payrollPeriod.update).not.toHaveBeenCalled();
    expect(prisma.payrollPeriod.create).not.toHaveBeenCalled();
  });

  it('tæller begge uløste statuser i payrollrapporten', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest
          .fn()
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(0),
      },
      payrollAdjustment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const result = await buildPayrollReportData(
      prisma as never,
      user as never,
      '2026-06-21',
      '2026-07-20',
    );

    expect(prisma.timeEntry.count).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          cinemaId: 2,
          status: {
            in: ['PENDING', 'NEEDS_CHANGES'],
          },
        }),
      }),
    );
    expect(result.pendingCount).toBe(3);
  });
});
