import { BadRequestException } from '@nestjs/common';
import { getPayrollPeriodWithTimeEntries } from './payroll-period-read-flow';

describe('payroll period read flow', () => {
  const period = {
    id: 12,
    cinemaId: 3,
    status: 'OPEN',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-07-31T23:59:59.999Z'),
  };

  it('henter periodestatus uden at indlæse tidsregistreringer', async () => {
    const findFirst = jest.fn().mockResolvedValue(period);
    const prisma = {
      payrollPeriod: {
        findFirst,
      },
    };

    const result = await getPayrollPeriodWithTimeEntries(
      prisma as never,
      {
        sub: 7,
        email: 'admin@example.com',
        role: 'ADMIN',
        cinemaId: 3,
      },
      '2026-07-01',
      '2026-07-31',
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        cinemaId: 3,
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-07-31T23:59:59.999Z'),
      },
    });
    expect(findFirst.mock.calls[0]?.[0]).not.toHaveProperty('include');
    expect(result).toBe(period);
  });

  it('bruger den valgte biograf for MASTER', async () => {
    const findFirst = jest.fn().mockResolvedValue(period);
    const prisma = {
      payrollPeriod: {
        findFirst,
      },
    };

    await getPayrollPeriodWithTimeEntries(
      prisma as never,
      {
        sub: 1,
        email: 'master@example.com',
        role: 'MASTER',
        cinemaId: null,
      },
      '2026-07-01',
      '2026-07-31',
      3,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        cinemaId: 3,
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-07-31T23:59:59.999Z'),
      },
    });
  });

  it('afviser global MASTER uden valgt biograf før databasekaldet', async () => {
    const findFirst = jest.fn();
    const prisma = {
      payrollPeriod: {
        findFirst,
      },
    };

    await expect(
      getPayrollPeriodWithTimeEntries(
        prisma as never,
        {
          sub: 1,
          email: 'master@example.com',
          role: 'MASTER',
          cinemaId: null,
        },
        '2026-07-01',
        '2026-07-31',
      ),
    ).rejects.toThrow(
      new BadRequestException('Vælg en aktiv biograf først.'),
    );
    expect(findFirst).not.toHaveBeenCalled();
  });
});
