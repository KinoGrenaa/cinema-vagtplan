import { ensurePayrollEntriesApproved } from './payroll-period-export';

describe('payroll unresolved entry read shape', () => {
  const user = {
    sub: 4,
    role: 'ADMIN',
    cinemaId: 2,
    canManagePayroll: true,
  };

  it('henter kun medarbejdernavnet for uløste tidsregistreringer', async () => {
    const prisma = {
      timeEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    await ensurePayrollEntriesApproved(
      prisma as never,
      user as never,
      '2026-06-21',
      '2026-07-20',
    );

    const query =
      prisma.timeEntry.findMany.mock.calls[0]?.[0];

    expect(query).not.toHaveProperty('include');
    expect(query.select).toEqual({
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    });
    expect(query.where).toEqual(
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
  });
});
