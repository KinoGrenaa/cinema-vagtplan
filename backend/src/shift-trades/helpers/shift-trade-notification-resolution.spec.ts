import { resolveShiftTradeOfferNotifications } from './shift-trade-notification-resolution';

describe('shift trade notification resolution', () => {
  it('lukker både direkte og vagtpulje-notifikationer uden at slette historikken', async () => {
    const prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 11 },
          { userId: 12 },
          { userId: 11 },
        ]),
        updateMany: jest.fn().mockResolvedValue({
          count: 3,
        }),
      },
    };

    await expect(
      resolveShiftTradeOfferNotifications(
        prisma as never,
        7,
        [31, 32],
      ),
    ).resolves.toEqual([11, 12]);

    const linkUrls = [
      '/shift-trades?tradeId=31',
      '/shift-trades?tradeId=32',
    ];

    expect(
      prisma.notification.findMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        type: {
          in: [
            'SHIFT_DIRECT',
            'SHIFT_TRADE',
          ],
        },
        linkUrl: {
          in: linkUrls,
        },
      },
      select: {
        userId: true,
      },
    });

    expect(
      prisma.notification.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        cinemaId: 7,
        type: {
          in: [
            'SHIFT_DIRECT',
            'SHIFT_TRADE',
          ],
        },
        linkUrl: {
          in: linkUrls,
        },
      },
      data: {
        isRead: true,
        linkUrl: null,
      },
    });
  });
});