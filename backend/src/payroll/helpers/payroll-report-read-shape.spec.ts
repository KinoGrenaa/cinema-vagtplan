import { buildPayrollReportData } from './payroll-report-data';

describe('payroll report read shape', () => {
  function createPrismaMock() {
    return {
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      payrollAdjustment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payrollPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      cinemaPayrollConfigurationVersion: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            mode: 'HOURS_ONLY',
            validFrom: new Date('2020-01-01T00:00:00.000Z'),
            validTo: null,
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({ mode: 'HOURS_ONLY' }),
      },
      payRule: { findMany: jest.fn().mockResolvedValue([]) },
      cinemaSpecialDay: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  it('undgår ubrugte lønperiode-joins på tidsregistreringer', async () => {
    const prisma = createPrismaMock();

    await buildPayrollReportData(
      prisma as never,
      {
        sub: 7,
        email: 'admin@example.com',
        role: 'ADMIN',
        cinemaId: 3,
        canManagePayroll: true,
      },
      '2026-07-01',
      '2026-07-31',
    );

    const query =
      prisma.timeEntry.findMany.mock.calls[0]?.[0];

    expect(query.include).not.toHaveProperty(
      'payrollPeriod',
    );
    expect(query.include).not.toHaveProperty(
      'originalPayrollPeriod',
    );
    expect(query.include).not.toHaveProperty(
      'adjustmentPayrollPeriod',
    );
    expect(query.include).toEqual(
      expect.objectContaining({
        user: expect.any(Object),
        payrollType: true,
        shift: {
          include: {
            jobFunction: {
              include: {
                defaultPayrollExportCode: true,
              },
            },
          },
        },
      }),
    );
  });

  it('bevarer perioderelationerne som efterreguleringer bruger', async () => {
    const prisma = createPrismaMock();

    await buildPayrollReportData(
      prisma as never,
      {
        sub: 7,
        email: 'admin@example.com',
        role: 'ADMIN',
        cinemaId: 3,
        canManagePayroll: true,
      },
      '2026-07-01',
      '2026-07-31',
    );

    expect(
      prisma.payrollAdjustment.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          originalPayrollPeriod: true,
          settlementPayrollPeriod: true,
        }),
      }),
    );
  });
});
