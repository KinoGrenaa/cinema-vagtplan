import { deleteShiftFlow } from './shift-delete-flow';
import { resolveOpenShiftLinkedActions } from './shift-linked-actions';

jest.mock('./shift-linked-actions', () => ({
  resolveOpenShiftLinkedActions: jest.fn().mockResolvedValue({
    tradeIds: [],
    staffingRequestIds: [],
    notificationUserIds: [],
  }),
}));

const admin = {
  sub: 2,
  email: 'admin@test.dk',
  role: 'ADMIN' as const,
  cinemaId: 1,
};

describe('shift delete flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveOpenShiftLinkedActions as jest.Mock).mockResolvedValue({
      tradeIds: [],
      staffingRequestIds: [],
      notificationUserIds: [],
    });
  });

  it('bruger den fælles PostgreSQL-lås med integer-casts før sletning', async () => {
    const shift = {
      id: 91,
      cinemaId: 1,
      userId: null,
      startTime: new Date(
        '2026-08-05T14:00:00.000Z',
      ),
      endTime: new Date(
        '2026-08-05T19:35:00.000Z',
      ),
      jobFunctionNameSnapshot:
        'A Vagt Hverdag',
      jobFunctionColorSnapshot:
        '#2563eb',
      jobFunction: {
        id: 7,
        name: 'A Vagt Hverdag',
        color: '#2563eb',
      },
      user: null,
    };

    const transaction = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      shift: {
        findFirst: jest
          .fn()
          .mockResolvedValue(shift),
        deleteMany: jest
          .fn()
          .mockResolvedValue({ count: 1 }),
      },
    };

    const prisma = {
      $transaction: jest.fn(
        async (
          callback: (
            value: typeof transaction,
          ) => unknown,
        ) => callback(transaction),
      ),
    };
    const auditLogsService = {
      create: jest
        .fn()
        .mockResolvedValue(undefined),
    };
    const realtimeGateway = {
      notifyCinema: jest.fn(),
    };
    const pushService = {
      sendToUserInCinema: jest.fn(),
    };

    const result = await deleteShiftFlow({
      prisma: prisma as never,
      realtimeGateway:
        realtimeGateway as never,
      pushService:
        pushService as never,
      auditLogsService:
        auditLogsService as never,
      formatShiftTime: () =>
        '05.08.2026 kl. 16.00-21.35',
      user: admin,
      id: shift.id,
    });

    expect(result).toBe(shift);
    expect(
      transaction.$executeRaw,
    ).toHaveBeenCalledTimes(1);

    const [
      queryParts,
      namespace,
      resourceId,
    ] =
      transaction.$executeRaw.mock
        .calls[0];

    expect(
      Array.from(queryParts).join(''),
    ).toContain(
      'CAST( AS integer)',
    );
    expect(namespace).toBe(56_002);
    expect(resourceId).toBe(shift.id);
    expect(
      transaction.shift.deleteMany,
    ).toHaveBeenCalledWith({
      where: {
        id: shift.id,
        cinemaId: 1,
      },
    });
    expect(
      auditLogsService.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE_SHIFT',
        entityId: shift.id,
        cinemaId: 1,
      }),
    );
    expect(
      realtimeGateway.notifyCinema,
    ).toHaveBeenCalledWith(
      1,
      'shiftsUpdated',
      {
        id: shift.id,
        cinemaId: 1,
        deleted: true,
      },
    );
    expect(
      pushService.sendToUserInCinema,
    ).not.toHaveBeenCalled();
  });
});
