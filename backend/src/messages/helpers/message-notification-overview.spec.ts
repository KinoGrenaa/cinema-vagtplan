import {
  buildUnreadMessageNotificationWhere,
} from './message-notification-overview';

describe(
  'message notification overview',
  () => {
    it('henter kun brugerens ulæste aktive beskeder i biografen', () => {
      expect(
        buildUnreadMessageNotificationWhere(
          9,
          7,
        ),
      ).toEqual({
        cinemaId: 7,
        isRead: false,
        archivedAt: null,
        recalledAt: null,
        OR: [
          {
            receiverId: 9,
          },
          {
            isBroadcast: true,
          },
        ],
      });
    });
  },
);
