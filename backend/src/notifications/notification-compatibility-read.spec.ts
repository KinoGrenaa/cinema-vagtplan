import {
  DEFAULT_NOTIFICATION_PAGE_SIZE,
} from './helpers/notification-page';
import { NotificationsController } from './notifications.controller';

describe('notification compatibility read', () => {
  it('bevarer array-svaret men begrænser læsningen til 50', async () => {
    const items = [
      {
        id: 81,
        title: 'Test',
      },
    ];
    const service = {
      findPageForUser:
        jest.fn().mockResolvedValue({
          items,
          hasMore: true,
          nextBeforeId: 31,
        }),
    };
    const controller =
      new NotificationsController(
        service as never,
      );
    const actor = {
      sub: 9,
      role: 'ADMIN',
      cinemaId: 7,
    };

    await expect(
      controller.getForUser(
        {
          user: actor,
        },
        '7',
      ),
    ).resolves.toEqual(items);

    expect(
      service.findPageForUser,
    ).toHaveBeenCalledWith(
      actor,
      7,
      {
        limit:
          DEFAULT_NOTIFICATION_PAGE_SIZE,
      },
    );
  });
});
