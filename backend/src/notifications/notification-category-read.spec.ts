import {
  BadRequestException,
} from '@nestjs/common';
import {
  buildVisibleNotificationWhere,
  getNotificationReadCategoryTypeWhere,
} from './helpers/notification-category';
import {
  NotificationsController,
} from './notifications.controller';
import {
  NotificationsService,
} from './notifications.service';

describe('Notification category read', () => {
  const actor = {
    sub: 7,
    role: 'EMPLOYEE',
    cinemaId: 3,
  };

  let prisma: {
    user: {
      findFirst: jest.Mock;
    };
    cinema: {
      findUnique: jest.Mock;
    };
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let service:
    NotificationsService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 7,
            cinemaMemberships: [
              {
                role: 'EMPLOYEE',
              },
            ],
          }),
      },
      cinema: {
        findUnique: jest.fn(),
      },
      notification: {
        findMany: jest
          .fn()
          .mockResolvedValue([]),
        count: jest.fn(),
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 2,
          }),
      },
    };

    service =
      new NotificationsService(
        prisma as never,
        {
          notifyUser: jest.fn(),
        } as never,
      );
  });

  it('udelader beskednotifikationer og læste direkte resultater fra sidevisningen', async () => {
    await service.findPageForUser(
      actor,
      3,
      {
        limit: 10,
      },
    );

    expect(
      prisma.notification.findMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 7,
        cinemaId: 3,
        ...buildVisibleNotificationWhere(),
      },
      orderBy: {
        id: 'desc',
      },
      take: 11,
    });
  });

  it('returnerer præcise ulæste tællere pr. kategori', async () => {
    prisma.notification.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);

    await expect(
      service.unreadSummary(
        actor,
        3,
      ),
    ).resolves.toEqual({
      count: 6,
      systemCount: 4,
      directTradeResultCount: 2,
    });

    expect(
      prisma.notification.count,
    ).toHaveBeenNthCalledWith(
      1,
      {
        where: {
          userId: 7,
          cinemaId: 3,
          isRead: false,
          type:
            getNotificationReadCategoryTypeWhere(
              'system',
            ),
        },
      },
    );
    expect(
      prisma.notification.count,
    ).toHaveBeenNthCalledWith(
      2,
      {
        where: {
          userId: 7,
          cinemaId: 3,
          isRead: false,
          type:
            getNotificationReadCategoryTypeWhere(
              'directTrades',
            ),
        },
      },
    );
  });

  it('markerer kun System som læst', async () => {
    await service.markCategoryAsRead(
      'system',
      actor,
      3,
    );

    expect(
      prisma.notification.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 7,
        cinemaId: 3,
        isRead: false,
        type:
          getNotificationReadCategoryTypeWhere(
            'system',
          ),
      },
      data: {
        isRead: true,
      },
    });
  });

  it('markerer kun direkte bytteresultater som læst', async () => {
    await service.markCategoryAsRead(
      'directTrades',
      actor,
      3,
    );

    expect(
      prisma.notification.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 7,
        cinemaId: 3,
        isRead: false,
        type:
          getNotificationReadCategoryTypeWhere(
            'directTrades',
          ),
      },
      data: {
        isRead: true,
      },
    });
  });

  it('afviser ukendt kategori', async () => {
    await expect(
      service.markCategoryAsRead(
        'poolTrades',
        actor,
        3,
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      prisma.notification.updateMany,
    ).not.toHaveBeenCalled();
  });

  it('controlleren videresender kategori og biograf', async () => {
    const controllerService = {
      unreadSummary: jest
        .fn()
        .mockResolvedValue({
          count: 3,
          systemCount: 2,
          directTradeResultCount: 1,
        }),
      markCategoryAsRead:
        jest.fn(),
    };
    const controller =
      new NotificationsController(
        controllerService as never,
      );
    const req = {
      user: actor,
    };

    await expect(
      controller.unreadSummary(
        req,
        '3',
      ),
    ).resolves.toEqual({
      count: 3,
      systemCount: 2,
      directTradeResultCount: 1,
    });

    await controller.markCategoryAsRead(
      req,
      'directTrades',
      '3',
    );

    expect(
      controllerService.markCategoryAsRead,
    ).toHaveBeenCalledWith(
      'directTrades',
      actor,
      3,
    );
  });
});
