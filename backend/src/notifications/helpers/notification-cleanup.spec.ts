import {
  buildReadNotificationDeleteWhere,
} from './notification-cleanup';

describe(
  'notification cleanup',
  () => {
    it('begrænser oprydning til bruger, biograf og læste notifikationer', () => {
      expect(
        buildReadNotificationDeleteWhere(
          9,
          7,
        ),
      ).toEqual({
        userId: 9,
        cinemaId: 7,
        isRead: true,
      });
    });
  },
);
