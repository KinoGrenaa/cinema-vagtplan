import { BadRequestException } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  let service: {
    findForUser: jest.Mock;
    unreadCount: jest.Mock;
    markAllAsRead: jest.Mock;
    markAsRead: jest.Mock;
  };
  let controller: NotificationsController;

  beforeEach(() => {
    service = {
      findForUser: jest.fn().mockResolvedValue([]),
      unreadCount: jest.fn().mockResolvedValue(2),
      markAllAsRead: jest.fn().mockResolvedValue({ count: 2 }),
      markAsRead: jest.fn().mockResolvedValue({ id: 8, isRead: true }),
    };
    controller = new NotificationsController(service as never);
  });

  it('videresender en valideret valgt biograf ved listekald', async () => {
    const req = {
      user: {
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 3,
      },
    };

    await controller.getForUser(req, '3');

    expect(service.findForUser).toHaveBeenCalledWith(req.user, 3);
  });

  it('returnerer unread-count i controllerens responseformat', async () => {
    const req = {
      user: {
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 3,
      },
    };

    await expect(controller.unreadCount(req, '3')).resolves.toEqual({
      count: 2,
    });
    expect(service.unreadCount).toHaveBeenCalledWith(req.user, 3);
  });

  it('tillader udeladt valgfri biograf', async () => {
    const req = {
      user: {
        sub: 7,
        role: 'EMPLOYEE',
        cinemaId: 3,
      },
    };

    await controller.markAllAsRead(req, undefined);

    expect(service.markAllAsRead).toHaveBeenCalledWith(req.user, undefined);
  });

  it.each(['0', '-1', '1.5', 'ikke-et-id'])(
    'afviser ugyldigt notifikations-ID %s',
    (id) => {
      expect(() =>
        controller.markAsRead(
          {
            user: {
              sub: 7,
              role: 'EMPLOYEE',
              cinemaId: 3,
            },
          },
          id,
          '3',
        ),
      ).toThrow(BadRequestException);

      expect(service.markAsRead).not.toHaveBeenCalled();
    },
  );

  it.each(['0', '-1', '2.5', 'ikke-et-id'])(
    'afviser ugyldigt valgfrit biograf-ID %s',
    (cinemaId) => {
      expect(() =>
        controller.getForUser(
          {
            user: {
              sub: 7,
              role: 'EMPLOYEE',
              cinemaId: 3,
            },
          },
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(service.findForUser).not.toHaveBeenCalled();
    },
  );
});
