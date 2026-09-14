import {
  ForbiddenException,
} from '@nestjs/common';
import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';
import {
  acceptShiftTrade,
  resolveShiftAcceptedRealtimeRecipientIds,
} from './shift-trade-accept-flow';
import { cancelShiftTrade } from './shift-trade-cancel-flow';
import { rejectShiftTrade } from './shift-trade-reject-flow';
import { resolveShiftTradeOfferNotifications } from './shift-trade-notification-resolution';

jest.mock('./shift-trade-notification-resolution', () => ({
  resolveShiftTradeOfferNotifications: jest.fn().mockResolvedValue([]),
}));

const actor = {
  sub: 8,
  role: 'EMPLOYEE',
  cinemaId: 2,
};

function createActorUser() {
  return {
    id: 8,
    role: 'ADMIN',
    isActive: true,
    cinemaMemberships: [
      {
        role: 'EMPLOYEE',
      },
    ],
  };
}

function createTrade(
  overrides = {},
) {
  return {
    id: 12,
    shiftId: 21,
    cinemaId: 2,
    offeredByUserId: 4,
    targetUserId: 8,
    status: ShiftTradeStatus.OPEN,
    type: ShiftTradeType.DIRECT,
    ...overrides,
  };
}

function createUpdatedTrade(
  overrides = {},
) {
  return {
    ...createTrade(overrides),
    shiftStartTimeSnapshot: new Date(
      '2099-01-01T18:00:00.000Z',
    ),
    shiftEndTimeSnapshot: new Date(
      '2099-01-01T20:00:00.000Z',
    ),
    jobFunctionIdSnapshot: 5,
    jobFunctionNameSnapshot: 'A Vagt',
    jobFunctionColorSnapshot: '#2563eb',
    shift: {},
    offeredByUser: {},
    targetUser: {},
    acceptedByUser: {},
    rejectedByUser: {},
  };
}

function createPrisma(tx: any) {
  return {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          createActorUser(),
        ),
    },
    $transaction: jest.fn(
      async (
        callback: (
          client: any,
        ) => unknown,
      ) => callback(tx),
    ),
  };
}

function createAcceptTx(
  options: {
    ownerId?: number;
    qualified?: boolean;
    claimCount?: number;
    approvedLeave?: boolean;
  } = {},
) {
  const startTime = new Date(
    Date.now() + 60 * 60 * 1000,
  );
  const endTime = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  );
  const trade = createTrade();

  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    timeEntry: {
      findFirst: jest
        .fn()
        .mockResolvedValue(null),
    },
    shiftTrade: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(trade)
        .mockResolvedValueOnce(trade),
      updateMany: jest
        .fn()
        .mockResolvedValue({
          count: options.claimCount ?? 1,
        }),
      findUnique: jest
        .fn()
        .mockResolvedValue(
          createUpdatedTrade({
            status: ShiftTradeStatus.ACCEPTED,
          }),
        ),
    },
    shift: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce({
          id: 21,
          userId: options.ownerId ?? 4,
          startTime,
          endTime,
          jobFunctionId: 5,
        })
        .mockResolvedValueOnce(null),
      updateMany: jest
        .fn()
        .mockResolvedValue({ count: 1 }),
    },
    userJobFunction: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.qualified === false
            ? null
            : { id: 1 },
        ),
    },
    leaveRequest: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.approvedLeave
            ? { id: 77 }
            : null,
        ),
    },
    notification: {
      updateMany: jest.fn(),
    },
  };
}

describe('shift trade status flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      resolveShiftTradeOfferNotifications as jest.Mock
    ).mockResolvedValue([]);
  });

  it('målretter puljeaccept til afsender og stadig relevante kvalificerede kolleger', () => {
    expect(
      resolveShiftAcceptedRealtimeRecipientIds({
        type:
          ShiftTradeType.POOL,
        offeredByUserId: 4,
        acceptedByUserId: 8,
        qualifiedPoolUserIds: [
          4,
          8,
          9,
          10,
          9,
        ],
        declinedUserIds: [
          10,
        ],
      }),
    ).toEqual([
      4,
      9,
    ]);
  });

  it('målretter direkte accept til afsender men ikke den der selv accepterede', () => {
    expect(
      resolveShiftAcceptedRealtimeRecipientIds({
        type:
          ShiftTradeType.DIRECT,
        offeredByUserId: 4,
        acceptedByUserId: 8,
        targetUserId: 8,
      }),
    ).toEqual([
      4,
    ]);
  });

  it('giver forståelig fejl når en gammel dialog rammer et allerede afsluttet tilbud', async () => {
    const tx = createAcceptTx();
    tx.shiftTrade.findFirst =
      jest
        .fn()
        .mockResolvedValueOnce(
          createTrade({
            status:
              ShiftTradeStatus.ACCEPTED,
          }),
        );
    const prisma = createPrisma(tx);

    await expect(
      acceptShiftTrade(
        {
          prisma: prisma as never,
          realtime: {} as never,
          notifications: {} as never,
          push: {} as never,
        },
        12,
        actor,
      ),
    ).rejects.toThrow(
      'Vagten er ikke længere tilgængelig. Den kan være blevet overtaget eller tilbuddet kan være lukket.',
    );

    expect(
      tx.$executeRaw,
    ).not.toHaveBeenCalled();
  });

  it('ruller accept tilbage, når en anden allerede har accepteret', async () => {
    const tx = createAcceptTx({
      claimCount: 0,
    });
    const prisma = createPrisma(tx);

    await expect(
      acceptShiftTrade(
        {
          prisma: prisma as never,
          realtime: {} as never,
          notifications: {} as never,
          push: {} as never,
        },
        12,
        actor,
      ),
    ).rejects.toThrow(
      'Vagten er ikke længere tilgængelig. Den kan være blevet overtaget eller tilbuddet kan være lukket.',
    );

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.shift.updateMany).not.toHaveBeenCalled();
  });

  it('afviser et gammelt tilbud, når vagten er omfordelt siden tilbuddet blev oprettet', async () => {
    const tx = createAcceptTx({
      ownerId: 99,
    });
    const prisma = createPrisma(tx);

    await expect(
      acceptShiftTrade(
        {
          prisma: prisma as never,
          realtime: {} as never,
          notifications: {} as never,
          push: {} as never,
        },
        12,
        actor,
      ),
    ).rejects.toThrow(
      'Vagtbyttet er ikke længere aktuelt, fordi vagten er blevet ændret',
    );

    expect(tx.shiftTrade.updateMany).not.toHaveBeenCalled();
    expect(tx.shift.updateMany).not.toHaveBeenCalled();
  });

  it('afviser en ukvalificeret modtager i backend', async () => {
    const tx = createAcceptTx({
      qualified: false,
    });
    const prisma = createPrisma(tx);

    await expect(
      acceptShiftTrade(
        {
          prisma: prisma as never,
          realtime: {} as never,
          notifications: {} as never,
          push: {} as never,
        },
        12,
        actor,
      ),
    ).rejects.toThrow(
      'Du er ikke kvalificeret til denne jobfunktion',
    );

    expect(tx.shiftTrade.updateMany).not.toHaveBeenCalled();
    expect(tx.shift.updateMany).not.toHaveBeenCalled();
  });

  it('afviser accept under godkendt fravær', async () => {
    const tx = createAcceptTx({
      approvedLeave: true,
    });
    const prisma = createPrisma(tx);

    await expect(
      acceptShiftTrade(
        {
          prisma: prisma as never,
          realtime: {} as never,
          notifications: {} as never,
          push: {} as never,
        },
        12,
        actor,
      ),
    ).rejects.toThrow(
      'Du har godkendt fravær i dette tidsrum',
    );
  });

    it('gemmer et personligt nej til en vagtpulje uden at lukke den for andre', async () => {
    const startTime = new Date(
      Date.now() + 60 * 60 * 1000,
    );
    const endTime = new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    );
    const currentTrade = {
      ...createTrade({
        type: ShiftTradeType.POOL,
        targetUserId: null,
      }),
      shift: {
        userId: 4,
        startTime,
        endTime,
        jobFunctionId: 5,
      },
    };
    const updatedTrade = {
      ...createUpdatedTrade({
        type: ShiftTradeType.POOL,
        targetUserId: null,
        status: ShiftTradeStatus.OPEN,
      }),
      shift: {
        startTime,
        endTime,
      },
    };
    const tx = {
      $executeRaw: jest
        .fn()
        .mockResolvedValue(1),
      shiftTrade: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(
            currentTrade,
          )
          .mockResolvedValueOnce(
            currentTrade,
          ),
        findUnique: jest
          .fn()
          .mockResolvedValue(
            updatedTrade,
          ),
      },
      shiftTradeDecline: {
        findUnique: jest
          .fn()
          .mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
      },
      userJobFunction: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 8,
            firstName: 'Test',
            lastName: '2 tester',
          }),
      },
    };
    const prisma = createPrisma(tx);
    const realtime = {
      notifyCinema: jest.fn(),
      notifyUser: jest.fn(),
    };
    const notifications = {
      create: jest
        .fn()
        .mockResolvedValue(undefined),
    };
    const push = {
      sendToUserInCinema: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    await expect(
      rejectShiftTrade(
        {
          prisma: prisma as never,
          realtime: realtime as never,
          notifications:
            notifications as never,
          push: push as never,
        },
        12,
        actor,
      ),
    ).resolves.toBe(updatedTrade);

    expect(
      tx.shiftTradeDecline.create,
    ).toHaveBeenCalledWith({
      data: {
        shiftTradeId: 12,
        userId: 8,
      },
    });
    expect(
      realtime.notifyCinema,
    ).toHaveBeenCalledWith(
      2,
      'shiftTradesUpdated',
      updatedTrade,
    );
    expect(
      realtime.notifyCinema,
    ).not.toHaveBeenCalledWith(
      2,
      'shiftRejected',
      expect.anything(),
    );
    expect(
      notifications.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 4,
        cinemaId: 2,
        title:
          'Kollega har takket nej til vagt i puljen',
        type: 'SHIFT_TRADE',
        linkUrl:
          '/my-shifts?shiftId=21',
      }),
    );
  });

  it('annullerer kun i den aktive biograf og rydder gamle tilbudsnotifikationer', async () => {
    const updatedTrade =
      createUpdatedTrade({
        offeredByUserId: 8,
        status: ShiftTradeStatus.CANCELLED,
      });
    const tx = {
      shiftTrade: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            createTrade({
              offeredByUserId: 8,
            }),
          ),
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: 1 }),
        findUnique: jest
          .fn()
          .mockResolvedValue(updatedTrade),
      },
    };
    const prisma = createPrisma(tx);
    const realtime = {
      notifyCinema: jest.fn(),
      notifyUser: jest.fn(),
    };
    const notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    const push = {
      sendToUserInCinema: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      cancelShiftTrade(
        {
          prisma: prisma as never,
          realtime: realtime as never,
          notifications: notifications as never,
          push: push as never,
        },
        12,
        actor,
      ),
    ).resolves.toBe(updatedTrade);

    expect(
      resolveShiftTradeOfferNotifications,
    ).toHaveBeenCalledWith(
      tx,
      2,
      [12],
    );
    expect(
      realtime.notifyCinema,
    ).toHaveBeenCalled();
    expect(
      notifications.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 8,
        cinemaId: 2,
        title:
          'Direkte vagttilbud trukket tilbage',
        type: 'SHIFT_TRADE_CANCELLED',
      }),
    );
    expect(
      push.sendToUserInCinema,
    ).toHaveBeenCalledWith(
      8,
      2,
      expect.objectContaining({
        title:
          'Direkte vagttilbud trukket tilbage',
      }),
    );
  });

  it('afviser MASTER ved personlige statusændringer', async () => {
    await expect(
      cancelShiftTrade(
        {
          prisma: {
            user: {
              findUnique: jest.fn(),
            },
          } as never,
          realtime: {} as never,
        },
        12,
        {
          sub: 1,
          role: 'MASTER',
          cinemaId: 2,
        },
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
