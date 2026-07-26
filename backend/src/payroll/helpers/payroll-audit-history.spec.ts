import { getPayrollAuditHistoryData } from './payroll-audit-history';

describe('payroll audit history query', () => {
  function createPrismaMock() {
    return {
      payrollPeriod: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  }

  it('henter kun de periodedata som historikvisningen bruger', async () => {
    const prisma = createPrismaMock();

    await getPayrollAuditHistoryData(
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

    const query = prisma.payrollPeriod.findMany.mock.calls[0]?.[0];

    expect(query).not.toHaveProperty('include');
    expect(query.where).toEqual({
      cinemaId: 3,
      startDate: {
        gte: new Date('2026-07-01T00:00:00.000Z'),
      },
      endDate: {
        lte: new Date('2026-07-31T23:59:59.999Z'),
      },
    });
    expect(query.select).toEqual(
      expect.objectContaining({
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        lockedAt: true,
        lockedByUserId: true,
        exportedAt: true,
        exportedByUserId: true,
        unlockedAt: true,
        unlockedByUserId: true,
        unlockNote: true,
        originalPayrollAdjustments: expect.any(Object),
        settlementPayrollAdjustments: expect.any(Object),
      }),
    );
  });

  it('bruger stabil sortering for perioder og efterreguleringer', async () => {
    const prisma = createPrismaMock();

    await getPayrollAuditHistoryData(
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

    const query = prisma.payrollPeriod.findMany.mock.calls[0]?.[0];

    expect(query.orderBy).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(
      query.select.originalPayrollAdjustments.orderBy,
    ).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(
      query.select.settlementPayrollAdjustments.orderBy,
    ).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });
});
