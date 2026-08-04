import { buildPayrollReportData } from './payroll-report-data';
import { createPayrollReportEmployeeGroup } from './payroll-report-groups';

describe('payroll membership identity', () => {
  it('uses employee and payroll IDs from the cinema membership', () => {
    expect(
      createPayrollReportEmployeeGroup(
        9,
        {
          firstName: 'Anna',
          lastName: 'Andersen',
          email: 'anna@example.com',
          cinemaMemberships: [
            {
              hireDate: new Date(
                '2026-01-01T00:00:00.000Z',
              ),
              employeeNumber: 'KG-42',
              payrollEmployeeId: 'LON-99',
            },
          ],
        },
      ),
    ).toMatchObject({
      userId: 9,
      employeeNumber: 'KG-42',
      payrollEmployeeId: 'LON-99',
    });
  });

  it('loads payroll identity from the report cinema on entries and adjustments', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
        count: jest
          .fn()
          .mockResolvedValue(0),
      },
      payrollAdjustment: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
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

    await buildPayrollReportData(
      prisma as never,
      {
        sub: 2,
        email: 'admin@example.com',
        role: 'ADMIN',
        cinemaId: 7,
        canManagePayroll: true,
      },
      '2026-07-01',
      '2026-07-31',
    );

    const expectedMembershipInclude = {
      where: {
        cinemaId: 7,
      },
      select: {
        hireDate: true,
        employeeNumber: true,
        payrollEmployeeId: true,
      },
      take: 1,
    };

    expect(
      prisma.timeEntry.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          user: {
            include: {
              cinemaMemberships:
                expectedMembershipInclude,
            },
          },
        }),
      }),
    );

    expect(
      prisma.payrollAdjustment.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          user: {
            include: {
              cinemaMemberships:
                expectedMembershipInclude,
            },
          },
        }),
      }),
    );
  });
});
