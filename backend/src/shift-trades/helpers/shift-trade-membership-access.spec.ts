import {
  ForbiddenException,
} from '@nestjs/common';
import {
  ShiftTradeType,
} from '@prisma/client';
import {
  resolveShiftTradeActorContext,
} from './shift-trade-accept-validation';
import { createShiftTrade } from './shift-trade-create-flow';

describe(
  'shift trade membership access',
  () => {
    it('bruger medlemskabets rolle og ignorerer global rolle/cinema', async () => {
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 8,
              role: 'ADMIN',
              isActive: true,
              cinemaMemberships: [
                {
                  role: 'EMPLOYEE',
                },
              ],
            }),
        },
      };

      await expect(
        resolveShiftTradeActorContext(
          prisma as never,
          {
            sub: 8,
            role: 'EMPLOYEE',
            cinemaId: 2,
          },
        ),
      ).resolves.toEqual({
        userId: 8,
        cinemaId: 2,
      });

      expect(
        prisma.user.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: 8,
        },
        select: {
          id: true,
          role: true,
          isActive: true,
          cinemaMemberships: {
            where: {
              cinemaId: 2,
              isActive: true,
            },
            select: {
              role: true,
            },
            take: 1,
          },
        },
      });
    });

    it('afviser en forældet sessionsrolle', async () => {
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 8,
              role: 'EMPLOYEE',
              isActive: true,
              cinemaMemberships: [
                {
                  role: 'ADMIN',
                },
              ],
            }),
        },
      };

      await expect(
        resolveShiftTradeActorContext(
          prisma as never,
          {
            sub: 8,
            role: 'EMPLOYEE',
            cinemaId: 2,
          },
        ),
      ).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('opretter kun vagtbytte for et aktivt medlemskab', async () => {
      const trade = {
        id: 12,
        cinemaId: 2,
        type:
          ShiftTradeType.POOL,
        targetUserId: null,
      };
      const tx = {
        $queryRaw: jest
          .fn()
          .mockResolvedValue([]),
        shift: {
          findFirst: jest
            .fn()
            .mockResolvedValue({
              id: 21,
              userId: 8,
              startTime: new Date(
                Date.now() +
                  60 * 60 * 1000,
              ),
            }),
        },
        shiftTrade: {
          findFirst: jest
            .fn()
            .mockResolvedValue(null),
          create: jest
            .fn()
            .mockResolvedValue(
              trade,
            ),
        },
      };
      const prisma = {
        cinema: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: 2,
              allowShiftTradePool: true,
              allowShiftTradeDirect: true,
            }),
        },
        user: {
          findFirst: jest
            .fn()
            .mockResolvedValue({
              id: 8,
            }),
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
        createShiftTrade(
          {
            prisma: prisma as never,
            realtime:
              realtime as never,
            notifications:
              {} as never,
            push: {} as never,
          },
          {
            shiftId: 21,
            offeredByUserId: 8,
            cinemaId: 2,
            type:
              ShiftTradeType.POOL,
          },
        ),
      ).resolves.toBe(trade);

      expect(
        prisma.user.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 8,
          isActive: true,
          role: {
            not: 'MASTER',
          },
          cinemaMemberships: {
            some: {
              cinemaId: 2,
              isActive: true,
            },
          },
        },
        select: {
          id: true,
        },
      });
    });
  },
);
