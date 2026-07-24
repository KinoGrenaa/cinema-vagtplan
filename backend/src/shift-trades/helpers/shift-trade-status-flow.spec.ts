import {
  ForbiddenException,
} from '@nestjs/common';
import {
  ShiftTradeStatus,
  ShiftTradeType,
} from '@prisma/client';
import { acceptShiftTrade } from './shift-trade-accept-flow';
import { cancelShiftTrade } from './shift-trade-cancel-flow';
import { rejectShiftTrade } from './shift-trade-reject-flow';

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
    shift: {},
    offeredByUser: {},
    targetUser: {},
    acceptedByUser: {},
    rejectedByUser: {},
  };
}

describe('shift trade status flows', () => {
  it('ruller accept tilbage, når en anden allerede har accepteret', async () => {
    const tx = {
      shiftTrade: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            createTrade(),
          ),
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 0,
          }),
      },
    };
    const prisma = {
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
      'Vagtbyttet er ikke længere åbent',
    );
  });

  it('afviser accept under godkendt fravær', async () => {
    const tx = {
      shiftTrade: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            createTrade(),
          ),
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 1,
          }),
      },
      shift: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 21,
            userId: 4,
            startTime: new Date(
              Date.now() +
                60 * 60 * 1000,
            ),
            endTime: new Date(
              Date.now() +
                2 * 60 * 60 * 1000,
            ),
          })
          .mockResolvedValueOnce(null),
      },
      leaveRequest: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 77,
          }),
      },
    };
    const prisma = {
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

  it('forhindrer afvisning af en vagtpulje', async () => {
    const tx = {
      shiftTrade: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            createTrade({
              type:
                ShiftTradeType.POOL,
              targetUserId: null,
            }),
          ),
      },
    };
    const prisma = {
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

    await expect(
      rejectShiftTrade(
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
      'Vagtpuljer kan ikke afvises',
    );
  });

  it('annullerer kun i den aktive biograf og kun én gang', async () => {
    const updatedTrade =
      createUpdatedTrade({
        status:
          ShiftTradeStatus.CANCELLED,
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
          .mockResolvedValue({
            count: 1,
          }),
        findUnique: jest
          .fn()
          .mockResolvedValue(
            updatedTrade,
          ),
      },
    };
    const prisma = {
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
    const realtime = {
      notifyCinema: jest.fn(),
    };

    await expect(
      cancelShiftTrade(
        {
          prisma: prisma as never,
          realtime:
            realtime as never,
        },
        12,
        actor,
      ),
    ).resolves.toBe(updatedTrade);

    expect(
      tx.shiftTrade.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 12,
        cinemaId: 2,
      },
    });
    expect(
      realtime.notifyCinema,
    ).toHaveBeenCalled();
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
