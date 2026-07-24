import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const notification = {
    id: 41,
    userId: 7,
    cinemaId: 3,
    title: 'Ny vagt',
    message:
      'Du har fået en ny vagt.',
    type: 'SHIFT_ASSIGNED',
    linkUrl: '/my-shifts',
    isRead: false,
  };

  let prisma: {
    cinema: {
      findUnique: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let realtime: {
    notifyUser: jest.Mock;
  };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      cinema: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 3,
          }),
      },
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
      notification: {
        create: jest
          .fn()
          .mockResolvedValue(
            notification,
          ),
        findMany: jest
          .fn()
          .mockResolvedValue([]),
        count: jest
          .fn()
          .mockResolvedValue(0),
        findFirst: jest
          .fn()
          .mockResolvedValue(
            notification,
          ),
        update: jest
          .fn()
          .mockResolvedValue({
            ...notification,
            isRead: true,
          }),
        updateMany: jest
          .fn()
          .mockResolvedValue({
            count: 1,
          }),
      },
    };
    realtime = {
      notifyUser: jest.fn(),
    };
    service = new NotificationsService(
      prisma as never,
      realtime as never,
    );
  });

  it('normaliserer og opretter en notifikation til en aktiv modtager', async () => {
    await expect(
      service.create({
        userId: 7,
        cinemaId: 3,
        title: ' Ny vagt ',
        message:
          ' Du har fået en ny vagt. ',
        type:
          ' SHIFT_ASSIGNED ',
        linkUrl:
          ' /my-shifts ',
      }),
    ).resolves.toBe(notification);

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
        isActive: true,
        OR: [
          {
            role: 'MASTER',
          },
          {
            cinemaMemberships: {
              some: {
                cinemaId: 3,
                isActive: true,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    expect(
      prisma.notification.create,
    ).toHaveBeenCalledWith({
      data: {
        userId: 7,
        cinemaId: 3,
        title: 'Ny vagt',
        message:
          'Du har fået en ny vagt.',
        type: 'SHIFT_ASSIGNED',
        linkUrl: '/my-shifts',
      },
    });
    expect(
      realtime.notifyUser,
    ).toHaveBeenCalledWith(
      7,
      'notificationsUpdated',
      notification,
    );
  });

  it('udelader et tomt valgfrit link efter trimning', async () => {
    await service.create({
      userId: 7,
      cinemaId: 3,
      title: 'Titel',
      message: 'Besked',
      type: 'INFO',
      linkUrl: ' ',
    });

    expect(
      prisma.notification.create,
    ).toHaveBeenCalledWith({
      data: {
        userId: 7,
        cinemaId: 3,
        title: 'Titel',
        message: 'Besked',
        type: 'INFO',
      },
    });
  });

  it.each([
    [
      'title',
      ' ',
      'Notifikationens titel må ikke være tom.',
    ],
    [
      'message',
      ' ',
      'Notifikationens besked må ikke være tom.',
    ],
    [
      'type',
      ' ',
      'Notifikationens type må ikke være tom.',
    ],
  ])(
    'afviser tomt felt %s',
    async (
      field,
      value,
      expectedMessage,
    ) => {
      await expect(
        service.create({
          userId: 7,
          cinemaId: 3,
          title: 'Titel',
          message: 'Besked',
          type: 'INFO',
          [field]: value,
        }),
      ).rejects.toThrow(
        expectedMessage,
      );

      expect(
        prisma.notification.create,
      ).not.toHaveBeenCalled();
    },
  );

  it('afviser en modtager uden aktiv tilknytning til biografen', async () => {
    prisma.user.findFirst
      .mockResolvedValue(null);

    await expect(
      service.create({
        userId: 7,
        cinemaId: 3,
        title: 'Titel',
        message: 'Besked',
        type: 'INFO',
      }),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('afgrænser notifikationslisten til bruger og aktivt medlemskab', async () => {
    await service.findForUser(
      {
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 3,
      },
      3,
    );

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: 3,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        cinemaMemberships: {
          where: {
            cinemaId: 3,
            isActive: true,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });
    expect(
      prisma.notification.findMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 7,
        cinemaId: 3,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('afviser en forældet medlemskabsrolle', async () => {
    prisma.user.findFirst
      .mockResolvedValue({
        id: 7,
        cinemaMemberships: [
          {
            role: 'ADMIN',
          },
        ],
      });

    await expect(
      service.unreadCount({
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 3,
      }),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(
      prisma.notification.count,
    ).not.toHaveBeenCalled();
  });

  it('afviser en anden valgt biograf for en ikke-MASTER', async () => {
    await expect(
      service.unreadCount(
        {
          sub: 7,
          role: 'ADMIN',
          cinemaId: 3,
        },
        4,
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('kræver valgt biograf for MASTER', async () => {
    await expect(
      service.findForUser({
        sub: 1,
        role: 'MASTER',
        cinemaId: null,
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('afviser ugyldigt notifikations-ID ved direkte servicekald', async () => {
    await expect(
      service.markAsRead(
        0,
        {
          sub: 7,
          role: 'EMPLOYEE',
          cinemaId: 3,
        },
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('ændrer kun en notifikation i brugerens aktive biograf', async () => {
    await expect(
      service.markAsRead(
        41,
        {
          sub: 7,
          role: 'EMPLOYEE',
          cinemaId: 3,
        },
        3,
      ),
    ).resolves.toEqual({
      ...notification,
      isRead: true,
    });

    expect(
      prisma.notification.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 41,
        userId: 7,
        cinemaId: 3,
      },
    });
    expect(
      prisma.notification.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 41,
      },
      data: {
        isRead: true,
      },
    });
  });

  it('afviser en biograf der ikke findes for MASTER', async () => {
    prisma.user.findFirst
      .mockResolvedValue({
        id: 1,
      });
    prisma.cinema.findUnique
      .mockResolvedValue(null);

    await expect(
      service.findForUser(
        {
          sub: 1,
          role: 'MASTER',
          cinemaId: null,
        },
        3,
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
