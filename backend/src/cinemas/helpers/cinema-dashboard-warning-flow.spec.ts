import { BadRequestException } from '@nestjs/common';
import {
  findDashboardWarningDecisions,
  recordDashboardWarningDecision,
} from './cinema-dashboard-warning-flow';

function createTransactionalPrisma(transaction: Record<string, unknown>) {
  return {
    $transaction: jest.fn(async (callback: (value: any) => unknown) =>
      callback(transaction),
    ),
  };
}

describe('cinema dashboard warning flow', () => {
  it('lists decisions inside the selected cinema and date range', async () => {
    const prisma = {
      dashboardWarningDecision: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    await findDashboardWarningDecisions(
      prisma as never,
      7,
      '2026-09-01',
      '2026-09-10',
    );

    expect(prisma.dashboardWarningDecision.findMany).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        localDate: { gte: '2026-09-01', lte: '2026-09-10' },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  });

  it('ignores a currently unassigned shift and stores a server-side snapshot', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      cinema: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          staffingLoadWarningEnabled: false,
          staffingLoadWarningVersion: 1,
        }),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue({
          id: 42,
          startTime: new Date('2026-09-04T15:30:00.000Z'),
          jobFunctionNameSnapshot: 'B Vagt Weekend',
        }),
      },
      dashboardWarningDecision: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 1, ...data })),
      },
    };
    const prisma = createTransactionalPrisma(transaction);

    await recordDashboardWarningDecision(prisma as never, 7, 2, {
      warningKey: 'UNASSIGNED_SHIFT:42:2026-09-04',
      warningType: 'UNASSIGNED_SHIFT',
      localDate: '2026-09-04',
      action: 'IGNORED',
      note: 'Bevidst',
    });

    expect(transaction.shift.findFirst).toHaveBeenCalledWith({
      where: { id: 42, cinemaId: 7, userId: null },
      select: { id: true, startTime: true, jobFunctionNameSnapshot: true },
    });
    expect(transaction.dashboardWarningDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          warningLabel: 'B Vagt Weekend er ubemandet',
          warningDetails: 'Vagten er ikke tildelt en medarbejder.',
          userId: 2,
        }),
      }),
    );
  });

  it('rejects ignoring an assigned shift', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      cinema: { findUnique: jest.fn().mockResolvedValue({ id: 7 }) },
      shift: { findFirst: jest.fn().mockResolvedValue(null) },
      dashboardWarningDecision: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const prisma = createTransactionalPrisma(transaction);

    await expect(
      recordDashboardWarningDecision(prisma as never, 7, 2, {
        warningKey: 'UNASSIGNED_SHIFT:42:2026-09-04',
        warningType: 'UNASSIGNED_SHIFT',
        localDate: '2026-09-04',
        action: 'IGNORED',
        note: null,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('ties a load-warning ignore to the active cinema rule version', async () => {
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      cinema: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          staffingLoadWarningEnabled: true,
          staffingLoadWarningVersion: 3,
          staffingLoadWarningMinSoldSeats: 180,
          staffingLoadWarningMaxTicketsPerEmployee: 55,
        }),
      },
      dashboardWarningDecision: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 2, ...data })),
      },
    };
    const prisma = createTransactionalPrisma(transaction);

    await recordDashboardWarningDecision(prisma as never, 7, 2, {
      warningKey: 'STAFFING_LOAD:2026-09-04:v3',
      warningType: 'STAFFING_LOAD',
      localDate: '2026-09-04',
      action: 'IGNORED',
      note: null,
    });

    expect(transaction.dashboardWarningDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          warningLabel: 'Høj forventet belastning',
          warningKey: 'STAFFING_LOAD:2026-09-04:v3',
        }),
      }),
    );
  });

  it('reopens only an ignored warning and keeps its snapshot', async () => {
    const latest = {
      id: 5,
      cinemaId: 7,
      warningKey: 'UNASSIGNED_SHIFT:42:2026-09-04',
      warningType: 'UNASSIGNED_SHIFT',
      localDate: '2026-09-04',
      action: 'IGNORED',
      warningLabel: 'B Vagt Weekend er ubemandet',
      warningDetails: 'Vagten er ikke tildelt en medarbejder.',
      note: null,
      userId: 2,
      user: { id: 2, firstName: 'Admin', lastName: 'Tester' },
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      cinema: { findUnique: jest.fn().mockResolvedValue({ id: 7 }) },
      dashboardWarningDecision: {
        findFirst: jest.fn().mockResolvedValue(latest),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 6, ...data })),
      },
    };
    const prisma = createTransactionalPrisma(transaction);

    await recordDashboardWarningDecision(prisma as never, 7, 2, {
      warningKey: latest.warningKey,
      warningType: 'UNASSIGNED_SHIFT',
      localDate: latest.localDate,
      action: 'REOPENED',
      note: 'Skal vurderes igen',
    });

    expect(transaction.dashboardWarningDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'REOPENED',
          warningLabel: latest.warningLabel,
          warningDetails: latest.warningDetails,
        }),
      }),
    );
  });
});
